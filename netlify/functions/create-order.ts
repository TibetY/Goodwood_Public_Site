import type { Handler, HandlerEvent } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';
import { clientIp, looksAutomated, verifyTurnstile } from '../shared/spam';
import { holdMinutes, isValidEmail, makeReference, mapOrderRpcError } from '../shared/orders';
import { notifyLodge, sendOrderEmail, type OrderRecord, type TicketedEventRecord } from '../shared/tickets';

// The single public write path on the ticketing system, and the only place a
// member of the public can create a row in event_orders.
//
// PCI NOTE: card details never touch this origin. Zeffy hosts the payment form
// and we only ever link to it, which keeps the lodge at SAQ A — the lightest
// self-assessment tier. Do not add a card input field to this site.

interface Payload {
  eventId?: string;
  quantity?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  notes?: string;
  paymentMethod?: 'zeffy' | 'etransfer' | 'cash';
  botField?: string;
  turnstileToken?: string;
  elapsedMs?: number;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const payload = parseBody<Payload>(event.body);
  if (!payload) return badRequest('Invalid JSON body');

  // Honeypot and timing trap. Respond 200 without doing anything so the bot gets
  // no signal that it was caught.
  if (looksAutomated(payload)) return ok({ ok: true });

  const humanVerified = await verifyTurnstile(
    (payload.turnstileToken || '').trim(),
    clientIp(event.headers as Record<string, string | undefined>),
  );
  if (!humanVerified) return json(400, { error: 'Verification failed', code: 'verification' });

  const buyerName = (payload.buyerName || '').trim();
  const buyerEmail = (payload.buyerEmail || '').trim().toLowerCase();
  const notes = (payload.notes || '').trim();
  const quantity = Math.round(Number(payload.quantity ?? 1));
  const method = payload.paymentMethod;

  if (!payload.eventId) return badRequest('Please choose an event');
  if (!buyerName) return badRequest('Please enter your name');
  if (!isValidEmail(buyerEmail)) return badRequest('That email address does not look right');
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 50) {
    return badRequest('Please choose a valid number of tickets');
  }
  if (notes.length > 1000) return badRequest('That note is too long');
  if (!method || !['zeffy', 'etransfer', 'cash'].includes(method)) {
    return badRequest('Please choose how you would like to pay');
  }

  const supabase = getServiceClient();

  const { data: ticketedEvent, error: eventError } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', payload.eventId)
    .single();

  if (eventError || !ticketedEvent) return notFound('Event not found');

  if (method === 'zeffy' && !ticketedEvent.zeffy_form_url) {
    return json(409, { error: 'Card payment is not available for this event', code: 'methodUnavailable' });
  }

  // Price, capacity and the sales window are all validated inside the RPC, under
  // a row lock — never here, and never from the request body.
  let created: any = null;
  let lastError = '';

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc('create_ticket_order', {
      p_event_id: payload.eventId,
      p_buyer_name: buyerName,
      p_buyer_email: buyerEmail,
      p_buyer_phone: (payload.buyerPhone || '').trim() || null,
      p_notes: notes,
      p_quantity: quantity,
      p_payment_method: method,
      p_payment_status: 'pending',
      p_reference: makeReference(),
      p_hold_minutes: holdMinutes(method, ticketedEvent),
      p_actor: null,
    });

    if (!error) { created = data; break; }
    lastError = error.message || '';
    // Only a reference collision is worth retrying.
    if (!lastError.includes('duplicate key') && !lastError.includes('23505')) break;
  }

  if (!created) {
    const mapped = mapOrderRpcError(lastError);
    if (mapped.status === 500) console.error('create-order: rpc failed', lastError);
    return json(mapped.status, { error: mapped.message, code: mapped.code });
  }

  const order = created as OrderRecord;
  const eventRecord = ticketedEvent as TicketedEventRecord;

  // ── Card: hand off to the lodge's hosted Zeffy form ───────────────────────
  //
  // Zeffy's API is read-only, so there is no session to create — we hold the
  // seat, send the buyer to Zeffy, and reconcile afterwards from the webhook
  // and the hourly sync (netlify/shared/reconcile.ts).
  //
  // The buyer's email is prefilled where Zeffy accepts it, because payer email
  // is the primary key the matcher uses to attribute the payment back to this
  // order.
  if (method === 'zeffy') {
    const url = new URL((ticketedEvent as any).zeffy_form_url);
    url.searchParams.set('email', order.buyer_email);
    if (order.buyer_name) url.searchParams.set('name', order.buyer_name);

    await supabase.from('event_order_audit').insert({
      order_id: order.id,
      kind: 'note',
      detail: 'Sent to Zeffy to pay by card',
    });

    return ok({
      checkoutUrl: url.toString(),
      reference: order.reference,
      token: order.checkin_token,
    });
  }

  // ── E-transfer / cash: reserve the seat and tell the buyer what to do ──────
  const emailed = await sendOrderEmail('reserved', order, eventRecord);
  await supabase.from('event_order_audit').insert({
    order_id: order.id,
    kind: emailed ? 'email_sent' : 'email_failed',
    detail: 'Reservation instructions',
  });
  if (emailed) {
    await supabase
      .from('event_orders')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', order.id);
  }

  // Best-effort heads-up to the Treasurer; never blocks the buyer.
  notifyLodge(order, eventRecord).catch(() => { /* logged inside */ });

  return ok({ reference: order.reference, token: order.checkin_token });
};
