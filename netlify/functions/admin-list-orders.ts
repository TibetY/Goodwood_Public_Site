import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, serverError } from '../shared/http';

// The tracker's data source: every order for one event, plus the totals the
// Treasurer actually cares about (paid vs outstanding, broken down by method).

interface OrderRow {
  quantity: number;
  amount_cents: number;
  refunded_amount_cents: number;
  payment_method: 'zeffy' | 'etransfer' | 'cash';
  payment_status: string;
  hold_expires_at: string | null;
  checked_in_at: string | null;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const eventId = event.queryStringParameters?.eventId;
  if (!eventId) return badRequest('eventId is required');

  const supabase = getServiceClient();

  const { data: ticketedEvent, error: eventError } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !ticketedEvent) return notFound('Event not found');

  const { data: orders, error } = await supabase
    .from('event_orders')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin-list-orders: query failed', error);
    return serverError(error.message);
  }

  const rows = (orders || []) as OrderRow[];
  const now = Date.now();

  const summary = {
    orderCount: rows.length,
    seatsTaken: 0,
    seatsPaid: 0,
    checkedIn: 0,
    paidCents: 0,
    outstandingCents: 0,
    refundedCents: 0,
    byMethod: {
      zeffy: { orders: 0, seats: 0, paidCents: 0, outstandingCents: 0 },
      etransfer: { orders: 0, seats: 0, paidCents: 0, outstandingCents: 0 },
      cash: { orders: 0, seats: 0, paidCents: 0, outstandingCents: 0 },
    } as Record<'zeffy' | 'etransfer' | 'cash', { orders: number; seats: number; paidCents: number; outstandingCents: number }>,
  };

  for (const o of rows) {
    const bucket = summary.byMethod[o.payment_method];
    const holdLive = !o.hold_expires_at || new Date(o.hold_expires_at).getTime() > now;

    if (o.payment_status === 'paid') {
      summary.seatsTaken += o.quantity;
      summary.seatsPaid += o.quantity;
      summary.paidCents += o.amount_cents;
      if (bucket) { bucket.orders += 1; bucket.seats += o.quantity; bucket.paidCents += o.amount_cents; }
      if (o.checked_in_at) summary.checkedIn += o.quantity;
    } else if (o.payment_status === 'pending' && holdLive) {
      summary.seatsTaken += o.quantity;
      summary.outstandingCents += o.amount_cents;
      if (bucket) { bucket.orders += 1; bucket.seats += o.quantity; bucket.outstandingCents += o.amount_cents; }
    }

    summary.refundedCents += o.refunded_amount_cents || 0;
  }

  return ok({ event: ticketedEvent, orders: orders || [], summary });
};
