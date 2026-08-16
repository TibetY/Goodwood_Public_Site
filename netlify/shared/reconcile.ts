// Turning a Zeffy payment into a paid order.
//
// Shared by the webhook and the hourly sync so both paths behave identically —
// the sync is not a lesser fallback, it is the same code on a timer.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  matchPaymentToOrder,
  normalizePayment,
  type MatchCandidate,
  type ZeffyPayment,
} from './zeffy';
import { sendOrderEmail, type OrderRecord, type TicketedEventRecord } from './tickets';

export interface ReconcileOutcome {
  paymentId: string;
  stored: boolean;
  matched: boolean;
  orderId?: string;
  reason?: string;
}

/**
 * Re-read stored payments from their untouched `raw` payload.
 *
 * Zeffy's field names are not something we control, so when the reader learns a
 * new spelling the rows already in the table are still parsed the old way. This
 * replays normalisation over them — which is the entire reason `raw` is kept —
 * so a fix reaches payments received before it shipped, not just after.
 *
 * Only fills gaps and corrects the derived columns; never touches order_id,
 * matched_at or ignored, so an admin's reconciliation decisions are preserved.
 */
export async function reparseStoredPayments(
  supabase: SupabaseClient,
  limit = 500,
): Promise<{ examined: number; updated: number }> {
  const { data: rows, error } = await supabase
    .from('zeffy_payments')
    .select('id, payer_name, payer_email, amount_cents, status, paid_at, raw')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('reconcile: reparse query failed', error);
    return { examined: 0, updated: 0 };
  }

  let updated = 0;

  for (const row of rows || []) {
    const parsed = normalizePayment((row.raw || {}) as Record<string, any>);
    if (!parsed) continue;

    const patch: Record<string, unknown> = {};
    if (parsed.payerName && parsed.payerName !== row.payer_name) patch.payer_name = parsed.payerName;
    if (parsed.payerEmail && parsed.payerEmail !== row.payer_email) patch.payer_email = parsed.payerEmail;
    // A stored zero is the signature of an amount field we failed to read.
    if (parsed.amountCents > 0 && parsed.amountCents !== row.amount_cents) patch.amount_cents = parsed.amountCents;
    if (parsed.status && parsed.status !== row.status) patch.status = parsed.status;
    if (parsed.paidAt && !row.paid_at) patch.paid_at = parsed.paidAt;

    if (!Object.keys(patch).length) continue;

    const { error: updateError } = await supabase
      .from('zeffy_payments')
      .update(patch)
      .eq('id', row.id);

    if (updateError) console.error(`reconcile: reparse update failed for ${row.id}`, updateError);
    else updated++;
  }

  return { examined: (rows || []).length, updated };
}

/**
 * Re-run matching over payments still sitting in the reconcile queue.
 *
 * Reparsing alone only fixes what the portal *displays*. A payment whose email
 * we failed to read could never be matched — the matcher keys on it — so once
 * reparsing recovers that field the queue deserves a second pass. Without this,
 * a reader fix would leave real, already-received money sitting unattributed.
 *
 * Ignored payments are left alone: an admin set those aside deliberately.
 */
export async function retryUnmatchedPayments(
  supabase: SupabaseClient,
  campaignId?: string | null,
  limit = 200,
): Promise<{ examined: number; matched: number }> {
  let query = supabase
    .from('zeffy_payments')
    .select('id, raw')
    .is('order_id', null)
    .eq('ignored', false)
    .order('received_at', { ascending: false })
    .limit(limit);

  if (campaignId) query = query.eq('campaign_id', campaignId);

  const { data: rows, error } = await query;
  if (error) {
    console.error('reconcile: retry query failed', error);
    return { examined: 0, matched: 0 };
  }

  let matched = 0;
  for (const row of rows || []) {
    const payment = normalizePayment((row.raw || {}) as Record<string, any>);
    if (!payment) continue;
    const outcome = await reconcilePayment(supabase, payment, 'manual');
    if (outcome.matched) matched++;
  }

  return { examined: (rows || []).length, matched };
}

/**
 * Record a Zeffy payment and, if it can be attributed confidently, mark the
 * corresponding order paid and send the ticket.
 *
 * Always stores the payment first. An unmatched payment is not an error — it
 * goes to the reconcile queue in the portal for an admin to resolve. Money is
 * never dropped on the floor just because we could not guess the owner.
 */
export async function reconcilePayment(
  supabase: SupabaseClient,
  payment: ZeffyPayment,
  source: 'webhook' | 'sync' | 'manual',
): Promise<ReconcileOutcome> {
  // Upsert, so webhook redelivery and an overlapping sync converge on one row.
  const { data: existing } = await supabase
    .from('zeffy_payments')
    .select('id, order_id, ignored')
    .eq('id', payment.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('zeffy_payments').insert({
      id: payment.id,
      campaign_id: payment.campaignId,
      payer_name: payment.payerName,
      payer_email: payment.payerEmail,
      amount_cents: payment.amountCents,
      currency: payment.currency,
      status: payment.status,
      paid_at: payment.paidAt,
      raw: payment.raw,
      source,
    });
    if (error && error.code !== '23505') {
      console.error('reconcile: could not store payment', error);
      return { paymentId: payment.id, stored: false, matched: false, reason: error.message };
    }
  }

  // Already handled, or deliberately set aside by an admin.
  if (existing?.order_id) {
    return { paymentId: payment.id, stored: true, matched: true, orderId: existing.order_id, reason: 'already matched' };
  }
  if (existing?.ignored) {
    return { paymentId: payment.id, stored: true, matched: false, reason: 'ignored' };
  }

  // Only orders on events tied to this Zeffy campaign are candidates, so a
  // payment can never be attributed to an unrelated event.
  let eventIds: string[] | null = null;
  if (payment.campaignId) {
    const { data: events } = await supabase
      .from('ticketed_events')
      .select('id')
      .eq('zeffy_campaign_id', payment.campaignId);
    eventIds = (events || []).map((e) => e.id);
    if (!eventIds.length) {
      return { paymentId: payment.id, stored: true, matched: false, reason: 'no event linked to campaign' };
    }
  }

  let query = supabase
    .from('event_orders')
    .select('id, buyer_email, amount_cents, created_at, payment_status, payment_method')
    .eq('payment_status', 'pending')
    .eq('payment_method', 'zeffy');

  if (eventIds) query = query.in('event_id', eventIds);

  const { data: candidates, error: candidatesError } = await query;
  if (candidatesError) {
    console.error('reconcile: candidate query failed', candidatesError);
    return { paymentId: payment.id, stored: true, matched: false, reason: candidatesError.message };
  }

  const { orderId, confidence } = matchPaymentToOrder(payment, (candidates || []) as MatchCandidate[]);

  if (!orderId || !confidence) {
    return { paymentId: payment.id, stored: true, matched: false, reason: 'no confident match' };
  }

  const { data: order, error: matchError } = await supabase.rpc('match_zeffy_payment', {
    p_payment_id: payment.id,
    p_order_id: orderId,
    p_confidence: confidence,
    p_actor: null,
  });

  if (matchError) {
    console.error('reconcile: match_zeffy_payment failed', matchError);
    return { paymentId: payment.id, stored: true, matched: false, reason: matchError.message };
  }

  if (order) {
    const { data: ticketedEvent } = await supabase
      .from('ticketed_events')
      .select('*')
      .eq('id', order.event_id)
      .single();

    if (ticketedEvent) {
      // A failed email must not fail the caller: the webhook would be retried,
      // the dedupe would swallow it, and the buyer would still have nothing.
      // Record it instead — an admin can resend from the portal.
      const sent = await sendOrderEmail('paid', order as OrderRecord, ticketedEvent as TicketedEventRecord);
      await supabase.from('event_order_audit').insert({
        order_id: order.id,
        kind: sent ? 'email_sent' : 'email_failed',
        detail: 'Zeffy payment confirmation',
      });
      if (sent) {
        await supabase
          .from('event_orders')
          .update({ confirmation_email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      }
    }
  }

  return { paymentId: payment.id, stored: true, matched: true, orderId };
}
