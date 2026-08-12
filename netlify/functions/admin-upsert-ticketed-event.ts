import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, ok, parseBody, serverError } from '../shared/http';

// Create or update a ticketed event. Follows the shape of upsert-officer.ts:
// insert when there is no id, update when there is.

interface Payload {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string | null;
  gcal_event_id?: string | null;
  price_cents?: number;
  capacity?: number | null;
  max_per_order?: number;
  sales_open_at?: string | null;
  sales_close_at?: string | null;
  allow_stripe?: boolean;
  allow_etransfer?: boolean;
  allow_cash?: boolean;
  etransfer_email?: string | null;
  etransfer_instructions?: string;
  etransfer_hold_hours?: number;
  refund_policy?: string;
  published?: boolean;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const payload = parseBody<Payload>(event.body);
  if (!payload) return badRequest('Invalid JSON body');

  const title = (payload.title || '').trim();
  if (!title) return badRequest('Title is required');
  if (!payload.starts_at) return badRequest('Start date and time are required');

  const priceCents = Math.round(Number(payload.price_cents ?? 0));
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return badRequest('Price must be zero or more');
  }

  const capacity =
    payload.capacity === null || payload.capacity === undefined || payload.capacity === ('' as unknown)
      ? null
      : Math.round(Number(payload.capacity));
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 1)) {
    return badRequest('Capacity must be at least 1, or empty for unlimited');
  }

  const maxPerOrder = Math.round(Number(payload.max_per_order ?? 10));
  if (!Number.isFinite(maxPerOrder) || maxPerOrder < 1 || maxPerOrder > 50) {
    return badRequest('Max per order must be between 1 and 50');
  }

  const holdHours = Math.round(Number(payload.etransfer_hold_hours ?? 72));
  if (!Number.isFinite(holdHours) || holdHours < 1 || holdHours > 720) {
    return badRequest('E-transfer hold must be between 1 and 720 hours');
  }

  if (payload.sales_open_at && payload.sales_close_at &&
      new Date(payload.sales_open_at) > new Date(payload.sales_close_at)) {
    return badRequest('Sales cannot close before they open');
  }

  const supabase = getServiceClient();

  const record = {
    slug: (payload.slug || '').trim() || slugify(title),
    title,
    description: payload.description ?? '',
    location: payload.location ?? '',
    starts_at: payload.starts_at,
    ends_at: payload.ends_at || null,
    gcal_event_id: payload.gcal_event_id?.trim() || null,
    price_cents: priceCents,
    capacity,
    max_per_order: maxPerOrder,
    sales_open_at: payload.sales_open_at || null,
    sales_close_at: payload.sales_close_at || null,
    allow_stripe: Boolean(payload.allow_stripe),
    allow_etransfer: payload.allow_etransfer !== false,
    allow_cash: payload.allow_cash !== false,
    etransfer_email: payload.etransfer_email?.trim() || process.env.TICKETS_ETRANSFER_EMAIL || null,
    etransfer_instructions: payload.etransfer_instructions ?? '',
    etransfer_hold_hours: holdHours,
    refund_policy: payload.refund_policy ?? '',
    published: Boolean(payload.published),
  };

  const query = payload.id
    ? supabase.from('ticketed_events').update(record).eq('id', payload.id).select().single()
    : supabase
        .from('ticketed_events')
        .insert({ ...record, created_by: auth.user.id })
        .select()
        .single();

  const { data, error } = await query;

  if (error) {
    // 23505 = unique_violation, which here is always the slug or gcal link.
    if (error.code === '23505') {
      return json(409, {
        error: 'Another event already uses that URL slug or calendar link',
        code: 'duplicate',
      });
    }
    console.error('admin-upsert-ticketed-event: write failed', error);
    return serverError(error.message);
  }

  return ok({ event: data });
};
