import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody } from '../shared/http';
import { holdMinutes, isValidEmail, makeReference, mapOrderRpcError } from '../shared/orders';
import { sendOrderEmail, type OrderRecord, type TicketedEventRecord } from '../shared/tickets';

// Records a payment taken outside the website: a walk-up cash sale at the door,
// an e-transfer that arrived without an online order, a cheque. This is the
// path that makes the tracker complete rather than just a record of web sales.

interface Payload {
  eventId?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  notes?: string;
  quantity?: number;
  paymentMethod?: 'stripe' | 'etransfer' | 'cash';
  markPaid?: boolean;
  paymentReference?: string;
  sendEmail?: boolean;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const payload = parseBody<Payload>(event.body);
  if (!payload) return badRequest('Invalid JSON body');

  const buyerName = (payload.buyerName || '').trim();
  const buyerEmail = (payload.buyerEmail || '').trim();
  const quantity = Math.round(Number(payload.quantity ?? 1));
  const method = payload.paymentMethod || 'cash';

  if (!payload.eventId) return badRequest('eventId is required');
  if (!buyerName) return badRequest('Buyer name is required');
  if (buyerEmail && !isValidEmail(buyerEmail)) return badRequest('That email address does not look right');
  if (!Number.isFinite(quantity) || quantity < 1) return badRequest('Quantity must be at least 1');
  if (!['stripe', 'etransfer', 'cash'].includes(method)) return badRequest('Unknown payment method');

  const supabase = getServiceClient();

  const { data: ticketedEvent, error: eventError } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', payload.eventId)
    .single();

  if (eventError || !ticketedEvent) return notFound('Event not found');

  const markPaid = payload.markPaid !== false;   // door sales default to paid

  // Retry on the (vanishingly rare) reference collision.
  let created: any = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc('create_ticket_order', {
      p_event_id: payload.eventId,
      p_buyer_name: buyerName,
      // Email is optional for a walk-up; the DB column is NOT NULL, so record a
      // sentinel rather than inventing an address that could receive mail.
      p_buyer_email: buyerEmail || 'no-email@goodwood159.ca',
      p_buyer_phone: (payload.buyerPhone || '').trim() || null,
      p_notes: (payload.notes || '').trim(),
      p_quantity: quantity,
      p_payment_method: method,
      p_payment_status: markPaid ? 'paid' : 'pending',
      p_reference: makeReference(),
      p_hold_minutes: holdMinutes(method, ticketedEvent),
      p_actor: auth.user.id,
    });

    if (!error) { created = data; break; }
    lastError = error.message || '';
    if (!lastError.includes('duplicate key') && !lastError.includes('23505')) break;
  }

  if (!created) {
    const mapped = mapOrderRpcError(lastError || '');
    if (mapped.status === 500) console.error('admin-create-order: rpc failed', lastError);
    return json(mapped.status, { error: mapped.message, code: mapped.code });
  }

  if (payload.paymentReference?.trim()) {
    await supabase
      .from('event_orders')
      .update({ payment_reference: payload.paymentReference.trim() })
      .eq('id', created.id);
  }

  await supabase.from('event_order_audit').insert({
    order_id: created.id,
    kind: 'note',
    detail: `Recorded manually by ${auth.user.email}`,
    actor_id: auth.user.id,
  });

  // Only mail a real address, and only when asked.
  const wantsEmail = payload.sendEmail !== false && Boolean(buyerEmail);
  if (wantsEmail) {
    const sent = await sendOrderEmail(
      markPaid ? 'paid' : 'reserved',
      created as OrderRecord,
      ticketedEvent as TicketedEventRecord,
    );
    if (sent) {
      await supabase
        .from('event_orders')
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq('id', created.id);
    }
  }

  return ok({ order: created });
};
