import type { Handler } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { badRequest, methodNotAllowed, notFound, ok, serverError } from '../shared/http';
import { confirmPayment, isZeffyConfigured } from '../shared/zeffy';
import { reconcilePayment } from '../shared/reconcile';

// Token-gated order lookup, used by the confirmation page and the ticket page.
//
// Returns a NARROW projection: enough for the buyer to see their own order, and
// nothing else. No payment-provider ids, no internal ids, no other buyer's data.
// Unknown tokens always 404, with no distinction between "wrong" and "missing".

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const token = event.queryStringParameters?.t;
  if (!token) return badRequest('t is required');

  const supabase = getServiceClient();

  const { data: order, error } = await supabase
    .from('event_orders')
    .select('*')
    .eq('checkin_token', token)
    .maybeSingle();

  if (error) {
    console.error('get-order: query failed', error);
    return serverError(error.message);
  }
  if (!order) return notFound('Order not found');

  const { data: ticketedEvent } = await supabase
    .from('ticketed_events')
    .select('id, slug, title, description, location, starts_at, ends_at, price_cents, etransfer_email, etransfer_instructions, refund_policy')
    .eq('id', order.event_id)
    .single();

  // Reconciliation safety net: a card buyer often lands back here seconds after
  // paying, before the webhook or the hourly sync has attributed the payment. If
  // a payment is already recorded against this order's email, reconcile it now
  // so the page can show "paid" instead of leaving them wondering.
  let current = order;
  if (
    current.payment_status === 'pending' &&
    current.payment_method === 'zeffy' &&
    isZeffyConfigured() &&
    Date.now() - new Date(current.created_at).getTime() > 5_000
  ) {
    try {
      const { data: candidate } = await supabase
        .from('zeffy_payments')
        .select('id')
        .is('order_id', null)
        .eq('ignored', false)
        .ilike('payer_email', current.buyer_email)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (candidate?.id) {
        const payment = await confirmPayment(candidate.id);
        if (payment) {
          const outcome = await reconcilePayment(supabase, payment, 'sync');
          if (outcome.matched && outcome.orderId === current.id) {
            const { data: refreshed } = await supabase
              .from('event_orders').select('*').eq('id', current.id).single();
            if (refreshed) current = refreshed;
          }
        }
      }
    } catch (err) {
      console.error('get-order: Zeffy reconciliation failed', err);
    }
  }

  return ok({
    order: {
      reference: current.reference,
      buyer_name: current.buyer_name,
      quantity: current.quantity,
      amount_cents: current.amount_cents,
      unit_price_cents: current.unit_price_cents,
      payment_method: current.payment_method,
      payment_status: current.payment_status,
      hold_expires_at: current.hold_expires_at,
      paid_at: current.paid_at,
      checked_in_at: current.checked_in_at,
      checked_in_count: current.checked_in_count,
      checkin_token: current.checkin_token,
      created_at: current.created_at,
    },
    event: ticketedEvent,
  });
};
