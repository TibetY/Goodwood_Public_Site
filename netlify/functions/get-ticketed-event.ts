import type { Handler } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { badRequest, methodNotAllowed, notFound, ok, serverError } from '../shared/http';

// Public single-event lookup for the purchase page. Same zero-PII contract as
// list-ticketed-events.

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const slug = event.queryStringParameters?.slug;
  if (!slug) return badRequest('slug is required');

  const supabase = getServiceClient();

  const { data: ticketedEvent, error } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    console.error('get-ticketed-event: query failed', error);
    return serverError(error.message);
  }
  if (!ticketedEvent) return notFound('Event not found');

  let seatsRemaining: number | null = null;

  if (ticketedEvent.capacity !== null) {
    const { data: seats, error: rpcError } = await supabase.rpc('seats_taken', {
      p_event_id: ticketedEvent.id,
    });
    if (rpcError) {
      console.error('get-ticketed-event: seats_taken failed', rpcError);
      return serverError(rpcError.message);
    }
    seatsRemaining = Math.max(0, ticketedEvent.capacity - (seats || 0));
  }

  return ok({
    event: {
      ...ticketedEvent,
      allow_stripe: ticketedEvent.allow_stripe && Boolean(process.env.STRIPE_SECRET_KEY),
      seats_remaining: seatsRemaining,
    },
  });
};
