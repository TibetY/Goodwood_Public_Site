import { schedule } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';

// Releases lapsed seat holds.
//
// This is NOT what makes capacity correct — seats_taken() in
// sql/002_ticketing.sql already ignores holds whose hold_expires_at has passed,
// so a seat frees itself the moment the hold lapses. This job exists so the
// tracker shows 'expired' rather than a stale 'pending', which is what the
// Treasurer reads.
//
// Runs at :23 so it does not collide with keep-alive.ts at :00.

export const handler = schedule('23 * * * *', async () => {
  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('expire-holds: Supabase is not configured', err);
    return { statusCode: 500 };
  }

  const nowIso = new Date().toISOString();

  const { data: expired, error } = await supabase
    .from('event_orders')
    .update({ payment_status: 'expired', hold_expires_at: null })
    .eq('payment_status', 'pending')
    .lt('hold_expires_at', nowIso)
    .select('id, reference');

  if (error) {
    console.error('expire-holds: update failed', error);
    return { statusCode: 500 };
  }

  if (expired?.length) {
    await supabase.from('event_order_audit').insert(
      expired.map((o) => ({
        order_id: o.id,
        kind: 'expired',
        detail: 'Hold lapsed before payment was received',
      })),
    );
    console.log(`expire-holds: expired ${expired.length} order(s)`);
  }

  return { statusCode: 200 };
});
