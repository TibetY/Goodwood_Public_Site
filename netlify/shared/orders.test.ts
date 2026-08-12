// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { makeReference, makeToken, formatMoney, isValidEmail, mapOrderRpcError, holdMinutes } from './orders';

describe('makeReference', () => {
    it('is prefixed and six characters long', () => {
        expect(makeReference()).toMatch(/^GW-[0-9A-Z]{6}$/);
    });

    it('never uses characters that are ambiguous when read aloud', () => {
        // References get dictated over the phone and typed into an e-transfer
        // memo by hand, so O/0, I/1/L and U must never appear.
        const sample = Array.from({ length: 300 }, () => makeReference()).join('');
        expect(sample).not.toMatch(/[O01ILU]/);
    });

    it('does not collide across a realistic number of orders', () => {
        const refs = new Set(Array.from({ length: 1000 }, () => makeReference()));
        expect(refs.size).toBe(1000);
    });
});

describe('makeToken', () => {
    it('produces 48 hex characters (192 bits)', () => {
        expect(makeToken()).toMatch(/^[0-9a-f]{48}$/);
    });

    it('is unique across many calls', () => {
        const tokens = new Set(Array.from({ length: 500 }, () => makeToken()));
        expect(tokens.size).toBe(500);
    });
});

describe('formatMoney', () => {
    it('formats integer cents', () => {
        expect(formatMoney(0)).toBe('$0.00');
        expect(formatMoney(4500)).toBe('$45.00');
        expect(formatMoney(5)).toBe('$0.05');
    });
});

describe('isValidEmail', () => {
    it('accepts ordinary addresses', () => {
        expect(isValidEmail('john@example.com')).toBe(true);
        expect(isValidEmail('john.smith+tickets@sub.example.co.uk')).toBe(true);
    });

    it('rejects malformed addresses', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('john')).toBe(false);
        expect(isValidEmail('john@')).toBe(false);
        expect(isValidEmail('john@example')).toBe(false);
        expect(isValidEmail('john smith@example.com')).toBe(false);
    });
});

describe('mapOrderRpcError', () => {
    it('maps each database exception to a status and a stable code', () => {
        expect(mapOrderRpcError('SOLD_OUT')).toMatchObject({ status: 409, code: 'soldOut' });
        expect(mapOrderRpcError('EVENT_SALES_CLOSED')).toMatchObject({ status: 409, code: 'salesClosed' });
        expect(mapOrderRpcError('EVENT_NOT_ON_SALE')).toMatchObject({ status: 409, code: 'salesNotOpen' });
        expect(mapOrderRpcError('INVALID_QUANTITY')).toMatchObject({ status: 400, code: 'invalidQuantity' });
        expect(mapOrderRpcError('EVENT_NOT_FOUND')).toMatchObject({ status: 404, code: 'eventNotFound' });
        expect(mapOrderRpcError('METHOD_UNAVAILABLE')).toMatchObject({ status: 409, code: 'methodUnavailable' });
    });

    it('finds the code inside a full Postgres error string', () => {
        expect(
            mapOrderRpcError('ERROR: SOLD_OUT\nCONTEXT: PL/pgSQL function create_ticket_order'),
        ).toMatchObject({ status: 409, code: 'soldOut' });
    });

    it('falls back to a 500 for anything unrecognised', () => {
        expect(mapOrderRpcError('connection reset')).toMatchObject({ status: 500, code: 'generic' });
    });
});

describe('holdMinutes', () => {
    const starts = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    it('holds a card order for exactly the Stripe session lifetime', () => {
        // Longer than 30 minutes would hold a seat past the session that can claim it.
        expect(holdMinutes('stripe', { starts_at: starts })).toBe(30);
    });

    it('uses the event’s configured e-transfer window', () => {
        expect(holdMinutes('etransfer', { etransfer_hold_hours: 72, starts_at: starts })).toBe(72 * 60);
        expect(holdMinutes('etransfer', { etransfer_hold_hours: 24, starts_at: starts })).toBe(24 * 60);
    });

    it('defaults the e-transfer window to 72 hours', () => {
        expect(holdMinutes('etransfer', { starts_at: starts })).toBe(72 * 60);
    });

    it('caps a cash hold at 14 days for a distant event', () => {
        const minutes = holdMinutes('cash', { starts_at: starts });
        expect(minutes).toBeLessThanOrEqual(14 * 24 * 60);
        expect(minutes).toBeGreaterThan(13 * 24 * 60);
    });

    it('holds cash only until the event when it is sooner than the cap', () => {
        const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const minutes = holdMinutes('cash', { starts_at: soon });
        expect(minutes).toBeGreaterThan(2 * 24 * 60);
        expect(minutes).toBeLessThanOrEqual(3 * 24 * 60);
    });

    it('never returns a non-positive hold for an event already under way', () => {
        const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        expect(holdMinutes('cash', { starts_at: past })).toBeGreaterThan(0);
    });
});
