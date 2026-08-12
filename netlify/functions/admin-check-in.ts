import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';

// Door check-in. Looks an order up by its checkin_token (from the QR) or by id
// (from the attendee list), then admits some or all of the party.
//
// Idempotent by design: the door screen queues actions in localStorage when the
// signal drops and replays them later, so a repeated request must be harmless.

interface Payload {
  token?: string;
  orderId?: string;
  /** 'in' admits `count` people, 'undo' resets the order to not-checked-in. */
  action?: 'in' | 'undo';
  count?: number;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const payload = parseBody<Payload>(event.body);
  if (!payload) return badRequest('Invalid JSON body');
  if (!payload.token && !payload.orderId) return badRequest('token or orderId is required');

  const supabase = getServiceClient();

  const lookup = supabase.from('event_orders').select('*');
  const { data: order, error } = payload.token
    ? await lookup.eq('checkin_token', payload.token).single()
    : await lookup.eq('id', payload.orderId!).single();

  if (error || !order) return notFound('Ticket not found');

  if (payload.action === 'undo') {
    const { data: updated, error: undoError } = await supabase
      .from('event_orders')
      .update({ checked_in_at: null, checked_in_by: null, checked_in_count: 0 })
      .eq('id', order.id)
      .select()
      .single();

    if (undoError) {
      console.error('admin-check-in: undo failed', undoError);
      return serverError(undoError.message);
    }

    await supabase.from('event_order_audit').insert({
      order_id: order.id, kind: 'checked_in', detail: 'Check-in undone', actor_id: auth.user.id,
    });

    return ok({ order: updated, alreadyCheckedIn: false });
  }

  const alreadyCheckedIn = Boolean(order.checked_in_at);
  const requested = Math.round(Number(payload.count ?? order.quantity));
  const nextCount = Math.min(
    order.quantity,
    (order.checked_in_count || 0) + (Number.isFinite(requested) && requested > 0 ? requested : order.quantity),
  );

  // Replayed queue entry for a fully-admitted order: report state, change nothing.
  if (alreadyCheckedIn && nextCount === order.checked_in_count) {
    return ok({ order, alreadyCheckedIn: true });
  }

  const { data: updated, error: updateError } = await supabase
    .from('event_orders')
    .update({
      checked_in_at: order.checked_in_at || new Date().toISOString(),
      checked_in_by: order.checked_in_by || auth.user.id,
      checked_in_count: nextCount,
    })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError) {
    console.error('admin-check-in: update failed', updateError);
    return serverError(updateError.message);
  }

  await supabase.from('event_order_audit').insert({
    order_id: order.id,
    kind: 'checked_in',
    detail: `${nextCount} of ${order.quantity} admitted`,
    actor_id: auth.user.id,
  });

  return ok({ order: updated, alreadyCheckedIn });
};
