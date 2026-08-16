// Zeffy integration.
//
// Zeffy is a Canadian fundraising platform that is free for nonprofits — no
// platform, transaction or card fees. Its public API is READ-ONLY, so unlike a
// Stripe-style integration we cannot create a checkout: Zeffy hosts the payment
// form, and our job is to notice payments and reconcile them against orders.
//
// Two things follow from that, and they shape everything below:
//
//  1. NO WEBHOOK SIGNATURE. Zeffy documents no signing secret, so a webhook body
//     is untrusted input — anyone who learns the URL could POST a fake payment.
//     We therefore treat the webhook purely as a *nudge* and re-read the payment
//     from the authenticated API before believing a single field of it. See
//     confirmPayment() and netlify/functions/zeffy-webhook.ts.
//
//  2. FIELD NAMES ARE NOT GUARANTEED. The API is in beta and its exact payload
//     shape is not something we control. Every read below goes through a
//     tolerant picker that accepts the plausible spellings, and the untouched
//     payload is stored in zeffy_payments.raw so a change at Zeffy's end is
//     diagnosable from production data instead of guesswork.

const API_BASE = process.env.ZEFFY_API_BASE || 'https://api.zeffy.com/api/v1';

export function isZeffyConfigured(): boolean {
  return Boolean(process.env.ZEFFY_API_KEY);
}

/** A Zeffy payment, normalised to the few fields the tracker actually needs. */
export interface ZeffyPayment {
  id: string;
  campaignId: string | null;
  payerName: string | null;
  payerEmail: string | null;
  amountCents: number;
  currency: string;
  status: string | null;
  paidAt: string | null;
  raw: Record<string, unknown>;
}

// ─── Tolerant field access ───────────────────────────────────────────────────

type Json = Record<string, any>;

/** First present, non-empty value among several candidate paths ("a.b.c"). */
function pick(source: Json, paths: string[]): any {
  for (const path of paths) {
    let value: any = source;
    for (const segment of path.split('.')) {
      if (value === null || value === undefined) break;
      value = value[segment];
    }
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/**
 * Money to integer cents.
 *
 * Zeffy may report an amount either in dollars (12.5) or already in cents
 * (1250), so the caller states which it is rather than us guessing from
 * magnitude — a $1250.00 ticket and 1250 cents are indistinguishable otherwise.
 */
export function toCents(value: unknown, unit: 'dollars' | 'cents'): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return unit === 'cents' ? Math.round(n) : Math.round(n * 100);
}

/** Normalise a raw Zeffy payment object into our shape. */
export function normalizePayment(raw: Json): ZeffyPayment | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = pick(raw, ['id', 'paymentId', 'payment_id', '_id']);
  if (!id) return null;

  // Zeffy's amount fields are documented in dollars; an explicit *_cents field
  // takes precedence when one is present.
  const centsField = pick(raw, ['amountInCents', 'amount_cents', 'totalAmountInCents']);
  const dollarsField = pick(raw, ['amount', 'totalAmount', 'total', 'amountPaid']);

  const amountCents = centsField !== undefined
    ? toCents(centsField, 'cents')
    : toCents(dollarsField, 'dollars');

  return {
    id: String(id),
    campaignId: pick(raw, ['campaignId', 'campaign_id', 'campaign.id', 'formId', 'form_id']) ?? null,
    payerName: pick(raw, [
      'payerName', 'payer_name', 'donorName', 'contact.fullName', 'contact.name',
      'contactName', 'firstName',
    ]) ?? null,
    payerEmail: (pick(raw, [
      'payerEmail', 'payer_email', 'email', 'contact.email', 'donorEmail',
    ]) ?? null)?.toString().trim().toLowerCase() ?? null,
    amountCents,
    currency: String(pick(raw, ['currency']) ?? 'cad').toLowerCase(),
    status: pick(raw, ['status', 'paymentStatus', 'state']) ?? null,
    paidAt: pick(raw, ['paidAt', 'paid_at', 'createdAt', 'created_at', 'date']) ?? null,
    raw,
  };
}

/** Extract the payment object from a webhook envelope, whatever it is wrapped in. */
export function paymentFromWebhook(body: Json): { event: string | null; payment: ZeffyPayment | null } {
  const event = pick(body, ['event', 'type', 'eventType']) ?? null;
  const candidate = pick(body, ['payment', 'data.payment', 'data', 'object']) ?? body;
  return { event: event ? String(event) : null, payment: normalizePayment(candidate) };
}

/** A payment counts as money in the bank only in these states. */
export function isCompleted(payment: ZeffyPayment): boolean {
  if (!payment.status) return true;   // no status reported → the webhook event itself is the signal
  return ['succeeded', 'completed', 'complete', 'paid', 'success'].includes(payment.status.toLowerCase());
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiGet(path: string, params: Record<string, string | undefined> = {}): Promise<Json> {
  const key = process.env.ZEFFY_API_KEY;
  if (!key) throw new Error('ZEFFY_API_KEY is not set');

  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Zeffy API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Re-read a payment from the authenticated API.
 *
 * This is what makes an unsigned webhook safe to act on: whatever the request
 * body claimed, the amount and status we use come from Zeffy over an
 * authenticated channel. Returns null when the payment does not exist, which is
 * exactly what a forged webhook produces.
 */
export async function confirmPayment(paymentId: string): Promise<ZeffyPayment | null> {
  try {
    const body = await apiGet(`/payments/${encodeURIComponent(paymentId)}`);
    const candidate = pick(body, ['payment', 'data']) ?? body;
    return normalizePayment(candidate);
  } catch (err) {
    console.error(`zeffy: could not confirm payment ${paymentId}`, err);
    return null;
  }
}

/**
 * Recent payments, newest first. Used by the hourly sync so reconciliation still
 * works when webhooks are misconfigured, undelivered, or were never set up.
 *
 * Cursor pagination: responses carry `has_more` and `next_cursor`, and the next
 * page is requested with `starting_after`.
 */
export async function listPayments(options: {
  campaignId?: string;
  since?: Date;
  maxPages?: number;
} = {}): Promise<ZeffyPayment[]> {
  const out: ZeffyPayment[] = [];
  let cursor: string | undefined;
  const maxPages = options.maxPages ?? 5;

  for (let page = 0; page < maxPages; page++) {
    const body = await apiGet('/payments', {
      campaignId: options.campaignId,
      startDate: options.since?.toISOString(),
      starting_after: cursor,
    });

    const items: Json[] = pick(body, ['data', 'payments', 'results', 'items']) ?? [];
    if (!Array.isArray(items)) break;

    for (const item of items) {
      const payment = normalizePayment(item);
      if (payment) out.push(payment);
    }

    const hasMore = pick(body, ['has_more', 'hasMore']) === true;
    cursor = pick(body, ['next_cursor', 'nextCursor']);
    if (!hasMore || !cursor) break;
  }

  return out;
}

// ─── Matching ────────────────────────────────────────────────────────────────

export interface MatchCandidate {
  id: string;
  buyer_email: string;
  amount_cents: number;
  created_at: string;
  payment_status: string;
  payment_method: string;
}

export interface MatchResult {
  orderId: string | null;
  confidence: 'exact' | 'email_amount' | null;
}

/**
 * Find the pending order a Zeffy payment belongs to.
 *
 * Zeffy hosts its own form, so the payment does not carry our order reference
 * unless the buyer typed it into a custom question. Matching is therefore
 * heuristic and deliberately conservative: an ambiguous match returns nothing
 * and goes to the admin queue, because silently marking the wrong person's
 * ticket paid is far worse than asking someone to click once.
 */
export function matchPaymentToOrder(payment: ZeffyPayment, candidates: MatchCandidate[]): MatchResult {
  const pending = candidates.filter(
    (o) => o.payment_status === 'pending' && o.payment_method === 'zeffy',
  );
  if (!pending.length || !payment.payerEmail) return { orderId: null, confidence: null };

  const sameEmail = pending.filter(
    (o) => o.buyer_email.trim().toLowerCase() === payment.payerEmail,
  );
  if (!sameEmail.length) return { orderId: null, confidence: null };

  // Email AND exact amount: as certain as this can get without a shared id.
  // Zeffy lets the buyer add a voluntary tip on top, so the paid amount may
  // exceed the ticket price — never fall below it.
  const exact = sameEmail.filter((o) => payment.amountCents >= o.amount_cents);
  if (exact.length === 1) return { orderId: exact[0].id, confidence: 'exact' };

  // Several plausible orders for one person: take the oldest unpaid one, which
  // is the order they started first and so most likely just paid for.
  if (exact.length > 1) {
    const oldest = [...exact].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0];
    return { orderId: oldest.id, confidence: 'email_amount' };
  }

  // Email matches but the amount is short — likely a partial or wrong ticket
  // count. A human should look at it.
  return { orderId: null, confidence: null };
}
