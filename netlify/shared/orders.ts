// Order helpers shared by the public and admin ticketing functions.

import { randomInt } from 'node:crypto';

/**
 * Crockford-ish alphabet with the ambiguous characters removed (no 0/O, 1/I/L,
 * U). Order references get read aloud over the phone and typed into an
 * e-transfer memo by hand, so "was that an O or a zero" must not be possible.
 */
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const REF_LENGTH = 6;

/** Human-facing order reference, e.g. "GW-7K3M9Q". */
export function makeReference(): string {
  let out = '';
  for (let i = 0; i < REF_LENGTH; i++) {
    out += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  }
  return `GW-${out}`;
}

/** Opaque bearer token for buyer-facing order links. */
export function makeToken(): string {
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) bytes[i] = randomInt(256);
  return Buffer.from(bytes).toString('hex');
}

export const formatMoney = (cents: number) => `$${(Math.round(cents) / 100).toFixed(2)}`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value);

/**
 * Errors raised by create_ticket_order (sql/002_ticketing.sql), mapped to HTTP
 * statuses and stable codes the UI can translate.
 */
const RPC_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  EVENT_NOT_FOUND:    { status: 404, code: 'eventNotFound',   message: 'Event not found' },
  EVENT_NOT_ON_SALE:  { status: 409, code: 'salesNotOpen',    message: 'Tickets are not on sale for this event' },
  EVENT_SALES_CLOSED: { status: 409, code: 'salesClosed',     message: 'Ticket sales have closed for this event' },
  INVALID_QUANTITY:   { status: 400, code: 'invalidQuantity', message: 'That quantity is not available' },
  METHOD_UNAVAILABLE: { status: 409, code: 'methodUnavailable', message: 'That payment method is not available for this event' },
  SOLD_OUT:           { status: 409, code: 'soldOut',         message: 'This event is sold out' },
};

export function mapOrderRpcError(message: string): { status: number; code: string; message: string } {
  for (const key of Object.keys(RPC_ERRORS)) {
    if (message.includes(key)) return RPC_ERRORS[key];
  }
  return { status: 500, code: 'generic', message: 'Could not create the order' };
}

/** Public site origin, used for links in emails and Stripe redirect URLs. */
export function siteUrl(): string {
  return (
    process.env.PUBLIC_SITE_URL ||
    process.env.URL ||
    'http://localhost:8888'
  ).replace(/\/$/, '');
}

/** How long a seat is held for an unpaid order, in minutes. */
export function holdMinutes(
  method: 'stripe' | 'etransfer' | 'cash',
  event: { etransfer_hold_hours?: number | null; starts_at: string },
): number {
  if (method === 'stripe') {
    // Matches Stripe's minimum Checkout Session lifetime exactly, so a seat is
    // never held longer than the session that could claim it.
    return 30;
  }
  if (method === 'etransfer') {
    return (event.etransfer_hold_hours ?? 72) * 60;
  }
  // Cash reservations exist to hold a seat until the event itself, capped at
  // 14 days so a distant event doesn't lock seats for months.
  const until = Math.min(
    new Date(event.starts_at).getTime(),
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  );
  return Math.max(60, Math.round((until - Date.now()) / 60000));
}
