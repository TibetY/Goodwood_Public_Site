import type { Handler } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { methodNotAllowed, ok } from '../shared/http';

// Public listing of events that are on sale. Carries ZERO buyer data — only the
// event itself plus how many seats are left.

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const headers = { 'Cache-Control': 'public, max-age=60' };

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    // Not configured yet — degrade like list-events.ts does, so the UI can show
    // a fallback instead of an error.
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ events: [], configured: false }) };
  }

  // Only future events, so a past dinner never reappears as buyable.
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('published', true)
    .gte('starts_at', cutoff)
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('list-ticketed-events: query failed', error);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: [], configured: true }) };
  }

  const withCapacity = (events || []).filter((e) => e.capacity !== null).map((e) => e.id);
  const seatsByEvent = new Map<string, number>();

  if (withCapacity.length) {
    const { data: orders } = await supabase
      .from('event_orders')
      .select('event_id, quantity, payment_status, hold_expires_at')
      .in('event_id', withCapacity);

    const now = Date.now();
    for (const o of orders || []) {
      // Mirrors seats_taken() in sql/002_ticketing.sql.
      const holdLive = !o.hold_expires_at || new Date(o.hold_expires_at).getTime() > now;
      const counts = o.payment_status === 'paid' || (o.payment_status === 'pending' && holdLive);
      if (counts) seatsByEvent.set(o.event_id, (seatsByEvent.get(o.event_id) || 0) + o.quantity);
    }
  }

  const payload = (events || []).map((e) => ({
    ...e,
    // Never advertise card payment without a Zeffy form to send the buyer to —
    // they would otherwise hit a dead end at checkout.
    allow_zeffy: e.allow_zeffy && Boolean(e.zeffy_form_url),
    seats_remaining: e.capacity === null ? null : Math.max(0, e.capacity - (seatsByEvent.get(e.id) || 0)),
  }));

  return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ events: payload, configured: true }) };
};
