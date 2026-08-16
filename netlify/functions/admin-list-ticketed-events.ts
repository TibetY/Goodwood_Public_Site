import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { json, methodNotAllowed, ok, serverError } from '../shared/http';

// Every ticketed event (published or not) with its sales position, for the
// portal's Manage Events table.

interface OrderRollup {
  event_id: string;
  quantity: number;
  amount_cents: number;
  payment_status: string;
  hold_expires_at: string | null;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const supabase = getServiceClient();

  const { data: events, error } = await supabase
    .from('ticketed_events')
    .select('*')
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('admin-list-ticketed-events: query failed', error);
    return serverError(error.message);
  }

  // One roll-up query rather than N per-event counts.
  const { data: orders, error: ordersError } = await supabase
    .from('event_orders')
    .select('event_id, quantity, amount_cents, payment_status, hold_expires_at');

  if (ordersError) {
    console.error('admin-list-ticketed-events: orders query failed', ordersError);
    return serverError(ordersError.message);
  }

  const now = Date.now();
  const stats = new Map<string, { seatsTaken: number; paidCents: number; outstandingCents: number; orderCount: number }>();

  for (const o of (orders || []) as OrderRollup[]) {
    const s = stats.get(o.event_id) || { seatsTaken: 0, paidCents: 0, outstandingCents: 0, orderCount: 0 };
    const holdLive = !o.hold_expires_at || new Date(o.hold_expires_at).getTime() > now;

    if (o.payment_status === 'paid') {
      s.seatsTaken += o.quantity;
      s.paidCents += o.amount_cents;
      s.orderCount += 1;
    } else if (o.payment_status === 'pending' && holdLive) {
      // Mirrors seats_taken() in sql/002_ticketing.sql: a live hold occupies a
      // seat, an expired one does not.
      s.seatsTaken += o.quantity;
      s.outstandingCents += o.amount_cents;
      s.orderCount += 1;
    }

    stats.set(o.event_id, s);
  }

  const withStats = (events || []).map((e) => ({
    ...e,
    stats: stats.get(e.id) || { seatsTaken: 0, paidCents: 0, outstandingCents: 0, orderCount: 0 },
  }));

  return ok({ events: withStats });
};
