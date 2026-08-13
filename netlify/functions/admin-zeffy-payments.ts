import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';
import { isZeffyConfigured, listPayments } from '../shared/zeffy';
import { reconcilePayment } from '../shared/reconcile';

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
    // Pull straight from the API on demand, for when someone does not want to
    // wait for the next hourly sync.
    case 'refresh': {
      if (!isZeffyConfigured()) {
        return json(409, { error: 'ZEFFY_API_KEY is not set', code: 'notConfigured' });
      }
      if (!payload.eventId) return badRequest('eventId is required');

      const { data: ticketedEvent } = await supabase
        .from('ticketed_events')
        .select('zeffy_campaign_id')
        .eq('id', payload.eventId)
        .single();

      if (!ticketedEvent?.zeffy_campaign_id) {
        return json(409, {
          error: 'This event is not linked to a Zeffy campaign yet',
          code: 'noCampaign',
        });
      }

      try {
        const payments = await listPayments({
          campaignId: ticketedEvent.zeffy_campaign_id,
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        });
        let matched = 0;
        for (const payment of payments) {
          const outcome = await reconcilePayment(supabase, payment, 'sync');
          if (outcome.matched) matched++;
        }
        return ok({ seen: payments.length, matched });
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
