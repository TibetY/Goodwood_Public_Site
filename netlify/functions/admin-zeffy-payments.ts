import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';
import { isZeffyConfigured, listPayments } from '../shared/zeffy';
import { reconcilePayment, reparseStoredPayments, retryUnmatchedPayments } from '../shared/reconcile';

// The reconcile queue.
//
// Zeffy hosts its own form, so a card payment does not carry our order
// reference. Most are matched automatically on payer email plus amount; the rest
// need a human, which is what this endpoint serves. Nothing is ever discarded —
// an unmatched payment stays visible until someone attributes or dismisses it.

interface Payload {
  action?: 'match' | 'ignore' | 'unignore' | 'refresh';
  paymentId?: string;
  orderId?: string;
  eventId?: string;
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
