import type { Handler } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { badRequest, methodNotAllowed, notFound, ok, serverError } from '../shared/http';
import { getStripe, isStripeConfigured } from '../shared/stripe';

// Token-gated order lookup, used by the confirmation page and the ticket page.
//
// Returns a NARROW projection: enough for the buyer to see their own order, and
// nothing else. No Stripe ids, no internal ids, no other buyer's data. Unknown
// tokens always 404, with no distinction between "wrong" and "missing".

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

  // Reconciliation safety net: if a card order is still pending shortly after
  // creation, ask Stripe directly. mark_order_paid is idempotent, so this is
  // free — and it means a misconfigured webhook degrades to "a bit slower"
  // rather than "silently broken".
  let current = order;
  if (
    current.payment_status === 'pending' &&
    current.payment_method === 'stripe' &&
    current.stripe_session_id &&
    isStripeConfigured() &&
    Date.now() - new Date(current.created_at).getTime() > 10_000
  ) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(current.stripe_session_id);
      if (session.payment_status === 'paid') {
        const { data: updated } = await supabase.rpc('mark_order_paid', {
          p_order_id: current.id,
          p_actor: null,
          p_reference: '',
          p_detail: 'Reconciled from Stripe on order lookup',
        });
        if (updated) current = updated;
      }
    } catch (err) {
      console.error('get-order: Stripe reconciliation failed', err);
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
