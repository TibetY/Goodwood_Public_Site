import type { Handler } from '@netlify/functions';
import type Stripe from 'stripe';
import { getServiceClient } from '../shared/supabase';
import { methodNotAllowed } from '../shared/http';
import { constructWebhookEvent, getStripe } from '../shared/stripe';
import { sendOrderEmail, type OrderRecord, type TicketedEventRecord } from '../shared/tickets';

// The authority on Stripe payment state.
//
// WHY THE WEBHOOK AND NOT THE SUCCESS REDIRECT marks an order paid:
//   - success_url is a plain GET the browser performs. Anyone can visit it, so
//     treating arrival as proof of payment would let a buyer mint free tickets.
//   - It is routinely never loaded: buyers close the tab after Apple Pay, switch
//     apps, or lose signal. A real fraction of successful payments never reach it.
//   - It carries no signature and no Stripe state.
// The webhook is HMAC-signed, retried by Stripe for up to three days until a 2xx,
// and is the only channel that reports later refunds and disputes.
// So: the redirect displays status; the webhook sets it.

const jsonOk = (body: string) => ({ statusCode: 200, body });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = constructWebhookEvent(
      event.body,
      event.isBase64Encoded,
      // Netlify lowercases header names.
      event.headers['stripe-signature'],
    );
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err);
    return { statusCode: 400, body: 'Invalid signature' };
  }

  const supabase = getServiceClient();

  // Idempotency gate. Stripe explicitly warns that events may be delivered more
  // than once; claiming the id first makes redelivery free.
  const { data: claimed, error: claimError } = await supabase
    .from('stripe_webhook_events')
    .insert({ id: stripeEvent.id, type: stripeEvent.type })
    .select('id');

  if (claimError) {
    // 23505 = we have already processed this event.
    if (claimError.code === '23505') return jsonOk('duplicate');
    console.error('stripe-webhook: dedupe insert failed', claimError);
    return { statusCode: 500, body: 'dedupe failed' };
  }
  if (!claimed?.length) return jsonOk('duplicate');

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== 'paid') break;

        const orderId = session.metadata?.order_id || session.client_reference_id;
        if (!orderId) {
          console.error('stripe-webhook: session has no order_id', session.id);
          break;
        }

        // mark_order_paid only acts where payment_status <> 'paid', so this is
        // safe to run any number of times.
        const { data: order, error } = await supabase.rpc('mark_order_paid', {
          p_order_id: orderId,
          p_actor: null,
          p_reference: session.payment_intent ? String(session.payment_intent) : '',
          p_detail: `Stripe checkout ${session.id}`,
        });

        if (error) {
          console.error('stripe-webhook: mark_order_paid failed', error);
          return { statusCode: 500, body: 'update failed' };
        }

        await supabase
          .from('stripe_webhook_events')
          .update({ order_id: orderId })
          .eq('id', stripeEvent.id);

        // Record what the lodge actually nets, so the Treasurer can reconcile
        // against the Stripe payout rather than the ticket price.
        try {
          const full = await getStripe().checkout.sessions.retrieve(session.id, {
            expand: ['payment_intent.latest_charge.balance_transaction'],
          });
          const intent = full.payment_intent as Stripe.PaymentIntent | null;
          const charge = intent?.latest_charge as Stripe.Charge | null;
          const balance = charge?.balance_transaction as Stripe.BalanceTransaction | null;

          if (charge) {
            await supabase
              .from('event_orders')
              .update({
                stripe_payment_intent_id: intent?.id ?? null,
                stripe_charge_id: charge.id,
                stripe_fee_cents: balance?.fee ?? null,
                net_cents: balance?.net ?? null,
              })
              .eq('id', orderId);
          }
        } catch (err) {
          console.error('stripe-webhook: fee lookup failed (non-fatal)', err);
        }

        // Email failure must NOT fail the webhook: Stripe would retry, the
        // dedupe table would swallow it, and the buyer would still get nothing
        // while the dashboard shows a permanent red endpoint. Record and move on;
        // the admin can resend from the portal.
        if (order) {
          const { data: ticketedEvent } = await supabase
            .from('ticketed_events')
            .select('*')
            .eq('id', order.event_id)
            .single();

          if (ticketedEvent) {
            const sent = await sendOrderEmail(
              'paid',
              order as OrderRecord,
              ticketedEvent as TicketedEventRecord,
            );
            await supabase.from('event_order_audit').insert({
              order_id: orderId,
              kind: sent ? 'email_sent' : 'email_failed',
              detail: 'Stripe payment confirmation',
            });
            if (sent) {
              await supabase
                .from('event_orders')
                .update({ confirmation_email_sent_at: new Date().toISOString() })
                .eq('id', orderId);
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id || session.client_reference_id;
        if (!orderId) break;

        // Frees the seat immediately rather than waiting for hold_expires_at.
        const { data: cancelled } = await supabase
          .from('event_orders')
          .update({ payment_status: 'cancelled', hold_expires_at: null })
          .eq('id', orderId)
          .eq('payment_status', 'pending')
          .select('id');

        if (cancelled?.length) {
          await supabase.from('event_order_audit').insert({
            order_id: orderId, kind: 'cancelled', detail: 'Stripe checkout session expired',
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        const orderId = charge.metadata?.order_id;

        const query = supabase.from('event_orders').select('id, amount_cents');
        const { data: order } = orderId
          ? await query.eq('id', orderId).maybeSingle()
          : await query.eq('stripe_charge_id', charge.id).maybeSingle();

        if (!order) break;

        // Refunds issued in the Stripe dashboard — where the money actually is —
        // flow back into the tracker automatically.
        await supabase
          .from('event_orders')
          .update({
            refunded_amount_cents: charge.amount_refunded,
            payment_status: charge.amount_refunded >= charge.amount ? 'refunded' : 'paid',
          })
          .eq('id', order.id);

        await supabase.from('event_order_audit').insert({
          order_id: order.id,
          kind: 'refunded',
          detail: `${(charge.amount_refunded / 100).toFixed(2)} refunded via Stripe`,
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = stripeEvent.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.order_id;
        if (orderId) {
          await supabase.from('event_order_audit').insert({
            order_id: orderId,
            kind: 'note',
            detail: `Card payment failed: ${intent.last_payment_error?.message || 'unknown reason'}`,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('stripe-webhook: handler error', err);
    return { statusCode: 500, body: 'handler error' };
  }

  return jsonOk('ok');
};
