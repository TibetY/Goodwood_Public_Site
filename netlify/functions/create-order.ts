import type { Handler, HandlerEvent } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';
import { clientIp, looksAutomated, verifyTurnstile } from '../shared/spam';
import { holdMinutes, isValidEmail, makeReference, mapOrderRpcError, siteUrl } from '../shared/orders';
import { notifyLodge, sendOrderEmail, type OrderRecord, type TicketedEventRecord } from '../shared/tickets';
import { createCheckoutSession, isStripeConfigured } from '../shared/stripe';

// The single public write path on the ticketing system, and the only place a
// member of the public can create a row in event_orders.
//
// PCI NOTE: card details never touch this origin. Stripe hosted Checkout is a
// redirect, which keeps the lodge at SAQ A — the lightest self-assessment tier.
// Do not add a card input field to this site.

interface Payload {
  eventId?: string;
  quantity?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  notes?: string;
  paymentMethod?: 'stripe' | 'etransfer' | 'cash';
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
  if (!method || !['stripe', 'etransfer', 'cash'].includes(method)) {
    return badRequest('Please choose how you would like to pay');
  }
  if (method === 'stripe' && !isStripeConfigured()) {
    return json(409, { error: 'Card payment is not available yet', code: 'methodUnavailable' });
  }

  const supabase = getServiceClient();

  const { data: ticketedEvent, error: eventError } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', payload.eventId)
    .single();

  if (eventError || !ticketedEvent) return notFound('Event not found');

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

  // ── Card: hand off to Stripe ──────────────────────────────────────────────
  if (method === 'stripe') {
    try {
      const session = await createCheckoutSession({
        orderId: order.id,
        reference: order.reference,
        buyerEmail: order.buyer_email,
        quantity: order.quantity,
        unitPriceCents: (order as any).unit_price_cents,
        eventId: eventRecord.id,
        eventTitle: eventRecord.title,
        eventLocation: eventRecord.location,
        successUrl: `${siteUrl()}/tickets/confirmation?t=${order.checkin_token}`,
        cancelUrl: `${siteUrl()}/events/${eventRecord.slug}/tickets?cancelled=1`,
      });

      await supabase
        .from('event_orders')
        .update({ stripe_session_id: session.id })
        .eq('id', order.id);

      return ok({ checkoutUrl: session.url, reference: order.reference, token: order.checkin_token });
    } catch (err) {
      console.error('create-order: Stripe session creation failed', err);
      // Release the seat rather than leaving a phantom hold behind.
      await supabase
        .from('event_orders')
        .update({ payment_status: 'cancelled', hold_expires_at: null })
        .eq('id', order.id);
      return serverError('Could not start the card payment. Please try again or choose another method.');
    }
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
