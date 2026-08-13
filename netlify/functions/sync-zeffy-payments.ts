import { schedule } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { isZeffyConfigured, listPayments } from '../shared/zeffy';
import { reconcilePayment } from '../shared/reconcile';

// Pulls recent Zeffy payments and reconciles them, hourly.
//
// This is not a backup for the webhook so much as the dependable half of the
// pair. Zeffy's webhook is unsigned and its delivery is not something we can
// inspect, so a poll over the authenticated API is what guarantees the lodge
// eventually sees every payment — even if the webhook was never configured.
//
// Runs at :41 to stay clear of keep-alive (:00) and expire-holds (:23).

const LOOKBACK_HOURS = 48;

export const handler = schedule('41 * * * *', async () => {
  if (!isZeffyConfigured()) {
    // Nothing to do until the lodge adds its API key — not an error.
    return { statusCode: 200 };
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('sync-zeffy-payments: Supabase is not configured', err);
    return { statusCode: 500 };
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  // Only campaigns actually linked to an event, so the sync stays proportional
  // to the lodge's ticketing rather than its whole fundraising history.
  const { data: events, error } = await supabase
    .from('ticketed_events')
    .select('zeffy_campaign_id')
    .not('zeffy_campaign_id', 'is', null);

  if (error) {
    console.error('sync-zeffy-payments: could not load campaigns', error);
    return { statusCode: 500 };
  }

  const campaignIds = Array.from(
    new Set((events || []).map((e) => e.zeffy_campaign_id).filter(Boolean) as string[]),
  );

  if (!campaignIds.length) {
    console.log('sync-zeffy-payments: no events are linked to a Zeffy campaign');
    return { statusCode: 200 };
  }

  let seen = 0;
  let matched = 0;

  for (const campaignId of campaignIds) {
    try {
      const payments = await listPayments({ campaignId, since });
      for (const payment of payments) {
        seen++;
        const outcome = await reconcilePayment(supabase, payment, 'sync');
        if (outcome.matched) matched++;
      }
    } catch (err) {
      // One bad campaign must not stop the others.
      console.error(`sync-zeffy-payments: campaign ${campaignId} failed`, err);
    }
  }

  console.log(`sync-zeffy-payments: ${seen} payment(s) seen, ${matched} matched`);
  return { statusCode: 200 };
});
