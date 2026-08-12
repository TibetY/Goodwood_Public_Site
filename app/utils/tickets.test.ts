import { describe, it, expect } from 'vitest';
import {
    formatMoney, seatsRemaining, isSoldOut, shouldShowSeatsLeft, isOnSale,
    availableMethods, maxSelectableQuantity, statusColor, isHoldExpired,
    type TicketedEvent,
} from './tickets';

// These are the rules the money depends on, so they are kept pure and tested
// directly rather than only through the UI.

function makeEvent(overrides: Partial<TicketedEvent> = {}): TicketedEvent {
    return {
        id: 'e1', slug: 'burns-night', title: 'Burns Night', description: '', location: 'Lodge Hall',
        starts_at: '2026-02-14T23:30:00.000Z', ends_at: null, gcal_event_id: null,
        price_cents: 4500, currency: 'cad', capacity: null, max_per_order: 10,
        sales_open_at: null, sales_close_at: null,
        allow_stripe: false, allow_etransfer: true, allow_cash: true,
        etransfer_email: null, etransfer_instructions: '', etransfer_hold_hours: 72,
        refund_policy: '', published: true,
        ...overrides,
    };
}

describe('formatMoney', () => {
    it('renders whole and fractional amounts without float drift', () => {
        expect(formatMoney(0)).toBe('$0.00');
        expect(formatMoney(4500)).toBe('$45.00');
        expect(formatMoney(999)).toBe('$9.99');
        expect(formatMoney(100000)).toBe('$1000.00');
    });

    it('handles the classic float trap: 70 tickets at $1.10', () => {
        // 0.1 + 0.2 style drift is why the whole system stores integer cents.
        expect(formatMoney(110 * 70)).toBe('$77.00');
    });
});

describe('seatsRemaining / isSoldOut', () => {
    it('returns null when the event has no capacity limit', () => {
        expect(seatsRemaining(makeEvent({ capacity: null }))).toBeNull();
        expect(isSoldOut(makeEvent({ capacity: null }))).toBe(false);
    });

    it('reports remaining seats when the server supplied them', () => {
        expect(seatsRemaining(makeEvent({ capacity: 50, seats_remaining: 6 }))).toBe(6);
    });

    it('is sold out at zero remaining', () => {
        expect(isSoldOut(makeEvent({ capacity: 50, seats_remaining: 0 }))).toBe(true);
    });

    it('never reports a negative count if the server oversold', () => {
        expect(seatsRemaining(makeEvent({ capacity: 50, seats_remaining: -3 }))).toBe(0);
    });
});

describe('shouldShowSeatsLeft', () => {
    it('stays quiet when plenty of seats are left', () => {
        // "3 of 200 sold" reads as a failure — don't advertise it.
        expect(shouldShowSeatsLeft(makeEvent({ capacity: 200, seats_remaining: 197 }))).toBe(false);
    });

    it('warns once stock drops to a fifth or less', () => {
        expect(shouldShowSeatsLeft(makeEvent({ capacity: 100, seats_remaining: 20 }))).toBe(true);
        expect(shouldShowSeatsLeft(makeEvent({ capacity: 100, seats_remaining: 21 }))).toBe(false);
    });

    it('says nothing when sold out — the sold-out state covers that', () => {
        expect(shouldShowSeatsLeft(makeEvent({ capacity: 100, seats_remaining: 0 }))).toBe(false);
    });

    it('says nothing for an uncapped event', () => {
        expect(shouldShowSeatsLeft(makeEvent({ capacity: null }))).toBe(false);
    });
});

describe('isOnSale', () => {
    const now = new Date('2026-01-15T12:00:00.000Z');

    it('is off sale while unpublished', () => {
        expect(isOnSale(makeEvent({ published: false }), now)).toBe(false);
    });

    it('is on sale with no window set', () => {
        expect(isOnSale(makeEvent(), now)).toBe(true);
    });

    it('respects the opening boundary', () => {
        expect(isOnSale(makeEvent({ sales_open_at: '2026-01-15T12:00:01.000Z' }), now)).toBe(false);
        expect(isOnSale(makeEvent({ sales_open_at: '2026-01-15T12:00:00.000Z' }), now)).toBe(true);
    });

    it('respects the closing boundary', () => {
        expect(isOnSale(makeEvent({ sales_close_at: '2026-01-15T11:59:59.000Z' }), now)).toBe(false);
        expect(isOnSale(makeEvent({ sales_close_at: '2026-01-15T12:00:00.000Z' }), now)).toBe(true);
    });

    it('is off sale when sold out even inside the window', () => {
        expect(isOnSale(makeEvent({ capacity: 10, seats_remaining: 0 }), now)).toBe(false);
    });
});

describe('availableMethods', () => {
    it('lists only the methods the event permits, card first', () => {
        expect(availableMethods(makeEvent({ allow_stripe: true }))).toEqual(['stripe', 'etransfer', 'cash']);
        expect(availableMethods(makeEvent({ allow_cash: false }))).toEqual(['etransfer']);
    });

    it('returns nothing when every method is switched off', () => {
        expect(availableMethods(makeEvent({ allow_etransfer: false, allow_cash: false }))).toEqual([]);
    });
});

describe('maxSelectableQuantity', () => {
    it('uses the per-order cap when stock is plentiful', () => {
        expect(maxSelectableQuantity(makeEvent({ max_per_order: 4, capacity: 100, seats_remaining: 90 }))).toBe(4);
    });

    it('is limited by remaining stock when that is smaller', () => {
        expect(maxSelectableQuantity(makeEvent({ max_per_order: 10, capacity: 100, seats_remaining: 3 }))).toBe(3);
    });

    it('falls back to the per-order cap for an uncapped event', () => {
        expect(maxSelectableQuantity(makeEvent({ max_per_order: 6, capacity: null }))).toBe(6);
    });
});

describe('isHoldExpired', () => {
    const now = new Date('2026-01-15T12:00:00.000Z');

    it('is true once a pending hold has lapsed', () => {
        expect(isHoldExpired({ payment_status: 'pending', hold_expires_at: '2026-01-15T11:59:00.000Z' }, now)).toBe(true);
    });

    it('is false while the hold is live', () => {
        expect(isHoldExpired({ payment_status: 'pending', hold_expires_at: '2026-01-15T12:01:00.000Z' }, now)).toBe(false);
    });

    it('never applies to a paid order', () => {
        expect(isHoldExpired({ payment_status: 'paid', hold_expires_at: '2020-01-01T00:00:00.000Z' }, now)).toBe(false);
    });
});

describe('statusColor', () => {
    it('maps each status to its chip colour', () => {
        expect(statusColor('paid')).toBe('success');
        expect(statusColor('pending')).toBe('warning');
        expect(statusColor('refunded')).toBe('error');
        expect(statusColor('cancelled')).toBe('default');
        expect(statusColor('expired')).toBe('default');
    });
});
