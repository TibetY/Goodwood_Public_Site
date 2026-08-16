import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, ok, parseBody, serverError } from '../shared/http';

// Deleting an event that has orders would orphan a money record, and the
// `on delete restrict` foreign key in sql/002_ticketing.sql prevents it at the
// database level. Check first so the UI can say "unpublish instead" rather than
// surfacing a raw constraint violation.

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const payload = parseBody<{ id?: string }>(event.body);
  if (!payload?.id) return badRequest('id is required');

  const supabase = getServiceClient();

  const { count, error: countError } = await supabase
    .from('event_orders')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', payload.id);

  if (countError) {
    console.error('admin-delete-ticketed-event: count failed', countError);
    return serverError(countError.message);
  }

  if ((count ?? 0) > 0) {
    return json(409, {
      error: `This event has ${count} order(s) and cannot be deleted. Unpublish it instead to take it off the website while keeping the records.`,
      code: 'hasOrders',
    });
  }

  const { error } = await supabase.from('ticketed_events').delete().eq('id', payload.id);

  if (error) {
    console.error('admin-delete-ticketed-event: delete failed', error);
    return serverError(error.message);
  }

  return ok({ ok: true });
};
