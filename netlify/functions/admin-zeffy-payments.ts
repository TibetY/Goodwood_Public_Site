import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';
import { isZeffyConfigured, listPayments, ticketQuantity } from '../shared/zeffy';
import { reconcilePayment, reparseStoredPayments, retryUnmatchedPayments } from '../shared/reconcile';
import { makeReference } from '../shared/orders';
import { sendOrderEmail, type OrderRecord, type TicketedEventRecord } from '../shared/tickets';

// The reconcile queue.
//
// Zeffy hosts its own form, so a card payment does not carry our order
// reference. Most are matched automatically on payer email plus amount; the rest
// need a human, which is what this endpoint serves. Nothing is ever discarded —
// an unmatched payment stays visible until someone attributes or dismisses it.

interface Payload {
  action?: 'match' | 'createOrder' | 'ignore' | 'unignore' | 'refresh';
  paymentId?: string;
  orderId?: string;
  eventId?: string;
  quantity?: number;
}

export const handler: Handler = async (event: HandlerEvent) => {
  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const supabase = getServiceClient();

  // ── List unmatched payments ───────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const { data: payments, error } = await supabase
      .from('zeffy_payments')
      .select('*')
      .is('order_id', null)
      .eq('ignored', false)
      .order('received_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('admin-zeffy-payments: list failed', error);
      return serverError(error.message);
    }

    return ok({ payments: payments || [], configured: isZeffyConfigured() });
  }

  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const payload = parseBody<Payload>(event.body);
  if (!payload?.action) return badRequest('action is required');

  switch (payload.action) {
    // Re-read what we already hold, then pull anything new from the API.
    //
    // The reparse pass runs first and runs unconditionally. Zeffy's field names
    // are not ours to control, so when the reader learns a spelling it did not
    // know before, the rows already in the table are still parsed the old way —
    // replaying them from the untouched `raw` payload is what makes a fix reach
    // payments received before it shipped. It needs no API key, which is why it
    // sits above the configured check rather than behind it.
    case 'refresh': {
      if (!payload.eventId) return badRequest('eventId is required');

      const { data: ticketedEvent } = await supabase
        .from('ticketed_events')
        .select('zeffy_campaign_id')
        .eq('id', payload.eventId)
        .single();

      const campaignId = ticketedEvent?.zeffy_campaign_id ?? null;

      const reparsed = await reparseStoredPayments(supabase);
      const retried = await retryUnmatchedPayments(supabase, campaignId);

      // Without a key there is nothing to pull, but the reparse above may still
      // have filled in the missing buyer names — report that rather than
      // failing outright, which would throw away work already done.
      if (!isZeffyConfigured()) {
        return ok({
          configured: false,
          reparsed: reparsed.updated,
          seen: 0,
          matched: retried.matched,
        });
      }

      if (!campaignId) {
        return json(409, {
          error: 'This event is not linked to a Zeffy campaign yet',
          code: 'noCampaign',
        });
      }

      try {
        const payments = await listPayments({
          campaignId,
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        });
        let matched = retried.matched;
        for (const payment of payments) {
          const outcome = await reconcilePayment(supabase, payment, 'sync');
          if (outcome.matched) matched++;
        }
        return ok({
          configured: true,
          reparsed: reparsed.updated,
          seen: payments.length,
          matched,
        });
      } catch (err: any) {
        console.error('admin-zeffy-payments: refresh failed', err);
        return serverError(err.message || 'Could not reach Zeffy');
      }
    }

    // ── Attribute a payment to an order by hand ─────────────────────────────
    case 'match': {
      if (!payload.paymentId || !payload.orderId) {
        return badRequest('paymentId and orderId are required');
      }

      const { data: payment } = await supabase
        .from('zeffy_payments')
        .select('id, order_id')
        .eq('id', payload.paymentId)
        .maybeSingle();

      if (!payment) return notFound('Payment not found');
      if (payment.order_id) {
        return json(409, { error: 'That payment is already matched to an order', code: 'alreadyMatched' });
      }

      const { data: order, error } = await supabase.rpc('match_zeffy_payment', {
        p_payment_id: payload.paymentId,
        p_order_id: payload.orderId,
        p_confidence: 'manual',
        p_actor: auth.user.id,
      });

      if (error) {
        console.error('admin-zeffy-payments: match failed', error);
        return serverError(error.message);
      }

      return ok({ order });
    }

    // ── Turn a payment with no order into one ───────────────────────────────
    //
    // The "match" action can only attach a payment to an order that already
    // exists. But a buyer who pays on Zeffy's form directly — instead of
    // starting on our ticket page — never creates that order, so the payment
    // has nothing to attach to and never becomes a seat. This mints the missing
    // order from the payment itself, takes the seat (capacity is still enforced
    // in create_ticket_order), links the payment, and emails the ticket.
    case 'createOrder': {
      if (!payload.paymentId || !payload.eventId) {
        return badRequest('paymentId and eventId are required');
      }

      const { data: payment } = await supabase
        .from('zeffy_payments')
        .select('id, order_id, ignored, payer_name, payer_email, raw')
        .eq('id', payload.paymentId)
        .maybeSingle();

      if (!payment) return notFound('Payment not found');
      if (payment.order_id) {
        return json(409, { error: 'That payment is already matched to an order', code: 'alreadyMatched' });
      }
      // The buyer's email is the ticket's destination and the order's key; Zeffy
      // gives it on every payment, so its absence is worth stopping on rather
      // than inventing a placeholder that quietly emails no one.
      if (!payment.payer_email) {
        return json(409, {
          error: 'This payment has no email, so a ticket could not be sent. Match it to an order you create by hand instead.',
          code: 'noEmail',
        });
      }

      const { data: ticketedEvent } = await supabase
        .from('ticketed_events')
        .select('*')
        .eq('id', payload.eventId)
        .single();

      if (!ticketedEvent) return notFound('Event not found');

      const quantity =
        payload.quantity && payload.quantity > 0
          ? Math.floor(payload.quantity)
          : ticketQuantity((payment.raw || {}) as Record<string, any>);

      // Create the order already paid — the money is in hand. A reference
      // collision is the one error worth retrying, exactly as create-order does.
      let created: any = null;
      let lastError = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await supabase.rpc('create_ticket_order', {
          p_event_id: payload.eventId,
          p_buyer_name: payment.payer_name || payment.payer_email,
          p_buyer_email: payment.payer_email,
          p_buyer_phone: null,
          p_notes: `Created from Zeffy payment ${payment.id}`,
          p_quantity: quantity,
          p_payment_method: 'zeffy',
          p_payment_status: 'paid',
          p_reference: makeReference(),
          p_hold_minutes: 0,
          p_actor: auth.user.id,
        });
        if (!error) { created = data; break; }
        lastError = error.message || '';
        if (!lastError.includes('duplicate key') && !lastError.includes('23505')) break;
      }

      if (!created) {
        if (lastError.includes('SOLD_OUT')) {
          return json(409, { error: 'This event is sold out, so no seat could be assigned', code: 'soldOut' });
        }
        console.error('admin-zeffy-payments: createOrder rpc failed', lastError);
        return serverError(lastError || 'Could not create the order');
      }

      // Link the payment to the order it just paid for. The order is already
      // paid, so match_zeffy_payment's mark_order_paid is a no-op — it only
      // stamps zeffy_payment_id and the reconciliation columns.
      const { error: linkError } = await supabase.rpc('match_zeffy_payment', {
        p_payment_id: payment.id,
        p_order_id: created.id,
        p_confidence: 'manual',
        p_actor: auth.user.id,
      });
      if (linkError) {
        console.error('admin-zeffy-payments: createOrder link failed', linkError);
        return serverError(linkError.message);
      }

      const sent = await sendOrderEmail('paid', created as OrderRecord, ticketedEvent as TicketedEventRecord);
      await supabase.from('event_order_audit').insert({
        order_id: created.id,
        kind: sent ? 'email_sent' : 'email_failed',
        detail: 'Ticket for Zeffy payment matched by admin',
      });
      if (sent) {
        await supabase
          .from('event_orders')
          .update({ confirmation_email_sent_at: new Date().toISOString() })
          .eq('id', created.id);
      }

      return ok({ order: created, emailed: sent });
    }

    case 'ignore':
    case 'unignore': {
      if (!payload.paymentId) return badRequest('paymentId is required');

      const ignored = payload.action === 'ignore';
      const { error } = await supabase
        .from('zeffy_payments')
        .update({ ignored })
        .eq('id', payload.paymentId);

      if (error) {
        console.error('admin-zeffy-payments: ignore toggle failed', error);
        return serverError(error.message);
      }
      return ok({ ok: true, ignored });
    }

    default:
      return badRequest('Unknown action');
  }
};
