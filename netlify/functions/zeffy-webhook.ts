import type { Handler } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { methodNotAllowed, parseBody } from '../shared/http';
import { confirmPayment, isCompleted, isZeffyConfigured, paymentFromWebhook } from '../shared/zeffy';
import { reconcilePayment } from '../shared/reconcile';

// Zeffy's payment.completed webhook.
//
// SECURITY: Zeffy documents no signing secret, so unlike a Stripe webhook there
// is nothing in the request that proves it came from Zeffy. This endpoint
// therefore trusts the request body for exactly one thing — the payment id —
// and then re-reads that payment from the authenticated API before acting.
// Amount, status and payer all come from the API response, never from the POST.
//
// A forged request either names a payment that does not exist (confirmPayment
// returns null, nothing happens) or names a real one, which is already recorded.
//
// A shared secret in the URL (ZEFFY_WEBHOOK_SECRET, passed as ?key=) is layered
// on top so unknown callers are rejected before any work is done. It is a weak
// factor on its own — URLs leak into logs — which is why the API re-read is the
// actual control and this is only a cheap first gate.

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const expectedSecret = process.env.ZEFFY_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = event.queryStringParameters?.key || event.headers['x-webhook-key'];
    if (provided !== expectedSecret) {
      console.warn('zeffy-webhook: rejected a request with a bad or missing key');
      return { statusCode: 401, body: 'Unauthorized' };
    }
  } else {
    console.warn('zeffy-webhook: ZEFFY_WEBHOOK_SECRET is not set — relying solely on API confirmation');
  }

  const body = parseBody<Record<string, unknown>>(event.body);
  if (!body) {
    // 200 so Zeffy does not retry something that will never parse.
    console.error('zeffy-webhook: unparseable body');
    return { statusCode: 200, body: 'ignored' };
  }

  const { event: eventName, payment: claimed } = paymentFromWebhook(body);

  if (!claimed?.id) {
    console.error('zeffy-webhook: no payment id in payload', JSON.stringify(body).slice(0, 500));
    return { statusCode: 200, body: 'ignored' };
  }

  if (eventName && !eventName.toLowerCase().includes('payment')) {
    return { statusCode: 200, body: 'ignored' };
  }

  // The only trusted source of truth for what this payment actually is.
  let payment = claimed;
  if (isZeffyConfigured()) {
    const confirmed = await confirmPayment(claimed.id);
    if (!confirmed) {
      console.warn(`zeffy-webhook: payment ${claimed.id} could not be confirmed against the API — ignoring`);
      return { statusCode: 200, body: 'unconfirmed' };
    }
    payment = confirmed;
  } else {
    // Without an API key there is no way to verify anything. Record it so the
    // money is visible in the reconcile queue, but never let it mark an order
    // paid on its own say-so.
    console.warn('zeffy-webhook: ZEFFY_API_KEY is not set — recording payment without confirmation');
  }

  if (!isCompleted(payment)) {
    return { statusCode: 200, body: 'not completed' };
  }

  try {
    const supabase = getServiceClient();
    const outcome = isZeffyConfigured()
      ? await reconcilePayment(supabase, payment, 'webhook')
      : await recordOnly(supabase, payment);

    console.log('zeffy-webhook:', JSON.stringify(outcome));
    // Always 2xx once we have stored the payment — Zeffy retries otherwise, and
    // an unmatched payment is a queue item, not a failure.
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('zeffy-webhook: handler error', err);
    return { statusCode: 500, body: 'error' };
  }
};

/** Store an unverifiable payment for manual review, without matching it. */
async function recordOnly(supabase: ReturnType<typeof getServiceClient>, payment: ReturnType<typeof paymentFromWebhook>['payment']) {
  if (!payment) return { stored: false };
  const { error } = await supabase.from('zeffy_payments').upsert({
    id: payment.id,
    campaign_id: payment.campaignId,
    payer_name: payment.payerName,
    payer_email: payment.payerEmail,
    amount_cents: payment.amountCents,
    currency: payment.currency,
    status: payment.status,
    paid_at: payment.paidAt,
    raw: payment.raw,
    source: 'webhook',
  });
  if (error) console.error('zeffy-webhook: store failed', error);
  return { stored: !error, matched: false, reason: 'no API key — manual review required' };
}
