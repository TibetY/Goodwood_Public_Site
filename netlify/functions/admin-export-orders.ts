import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, serverError } from '../shared/http';

// CSV export for the Treasurer. However good the table is, reconciliation
// against a bank statement happens in a spreadsheet.

const COLUMNS = [
  'Reference', 'Status', 'Method', 'Buyer', 'Email', 'Phone',
  'Quantity', 'Unit Price', 'Amount', 'Refunded', 'Payment Reference',
  'Ordered At', 'Paid At', 'Checked In At', 'Notes',
] as const;

/**
 * RFC 4180 quoting, plus a leading apostrophe on anything a spreadsheet would
 * treat as a formula. Buyer-supplied text ends up in this file, and
 * `=HYPERLINK(...)` in a name field is a real injection path.
 */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const money = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '' : (cents / 100).toFixed(2);

const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : '';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const eventId = event.queryStringParameters?.eventId;
  if (!eventId) return badRequest('eventId is required');

  const supabase = getServiceClient();

  const { data: ticketedEvent } = await supabase
    .from('ticketed_events')
    .select('slug, title')
    .eq('id', eventId)
    .single();

  if (!ticketedEvent) return notFound('Event not found');

  const { data: orders, error } = await supabase
    .from('event_orders')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('admin-export-orders: query failed', error);
    return serverError(error.message);
  }

  const lines = [COLUMNS.map(csvCell).join(',')];

  for (const o of orders || []) {
    lines.push([
      o.reference,
      o.payment_status,
      o.payment_method,
      o.buyer_name,
      o.buyer_email,
      o.buyer_phone || '',
      o.quantity,
      money(o.unit_price_cents),
      money(o.amount_cents),
      money(o.refunded_amount_cents),
      o.payment_reference || '',
      stamp(o.created_at),
      stamp(o.paid_at),
      stamp(o.checked_in_at),
      o.notes || '',
    ].map(csvCell).join(','));
  }

  const filename = `goodwood-${ticketedEvent.slug || 'event'}-orders.csv`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
    // BOM so Excel opens UTF-8 names correctly.
    body: '﻿' + lines.join('\r\n'),
  };
};
