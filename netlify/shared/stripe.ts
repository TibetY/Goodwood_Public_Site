// Stripe hosted Checkout.
//
// The whole integration is a redirect: we create a Checkout Session server-side
// and send the buyer to Stripe's own page. No Stripe.js, no publishable key, and
// no card field on this origin.
//
// Everything here is dormant until STRIPE_SECRET_KEY is set, so the site runs on
// e-transfer and cash alone until the lodge's Stripe account is approved.

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key);
  return cached;
}

export interface CheckoutInput {
  orderId: string;
  reference: string;
  buyerEmail: string;
  quantity: number;
  unitPriceCents: number;
  eventId: string;
  eventTitle: string;
  eventLocation: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(input: CheckoutInput) {
  const stripe = getStripe();

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: input.buyerEmail,
      client_reference_id: input.orderId,
      line_items: [
        {
          quantity: input.quantity,
          price_data: {
            currency: 'cad',
            // Read from the database by the caller — never from the request body.
            unit_amount: input.unitPriceCents,
            product_data: {
              name: input.eventTitle,
              ...(input.eventLocation ? { description: input.eventLocation } : {}),
            },
          },
        },
      ],
      metadata: { order_id: input.orderId, reference: input.reference, event_id: input.eventId },
      payment_intent_data: {
        metadata: { order_id: input.orderId, reference: input.reference },
      },
      // 30 minutes is Stripe's minimum, and matches the seat hold set for card
      // orders, so a seat is never held longer than the session that can claim it.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
    // Guards against a retried request creating two sessions for one order.
    { idempotencyKey: `order:${input.orderId}` },
  );
}

/**
 * Verify a webhook signature against the raw request body.
 *
 * Netlify may base64-encode the body, and Stripe's HMAC is over the exact bytes
 * it sent — parsing and re-stringifying the JSON always fails the check. This is
 * the single most common cause of "signature verification failed" on Netlify.
 */
export function constructWebhookEvent(
  body: string | null,
  isBase64Encoded: boolean | undefined,
  signature: string | undefined,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  if (!signature) throw new Error('Missing stripe-signature header');

  const raw = isBase64Encoded
    ? Buffer.from(body || '', 'base64')
    : Buffer.from(body || '', 'utf8');

  return getStripe().webhooks.constructEvent(raw, signature, secret);
}
