// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    toCents, normalizePayment, paymentFromWebhook, isCompleted, matchPaymentToOrder,
    ticketQuantity, type MatchCandidate, type ZeffyPayment,
} from './zeffy';

// Zeffy's API is in beta and we do not control its payload shape, so the reader
// is deliberately tolerant. These tests pin that tolerance down: if Zeffy renames
// a field to another spelling we already accept, nothing breaks; if it renames it
// to something new, the raw payload in zeffy_payments.raw shows what arrived.

describe('toCents', () => {
    it('converts dollars to integer cents', () => {
        expect(toCents(12.5, 'dollars')).toBe(1250);
        expect(toCents('45.00', 'dollars')).toBe(4500);
        expect(toCents(0, 'dollars')).toBe(0);
    });

    it('rounds away float error rather than truncating', () => {
        // 19.99 * 100 is 1998.9999... in binary floating point.
        expect(toCents(19.99, 'dollars')).toBe(1999);
        expect(toCents(0.1 + 0.2, 'dollars')).toBe(30);
    });

    it('passes cents through untouched', () => {
        expect(toCents(1250, 'cents')).toBe(1250);
        expect(toCents('4500', 'cents')).toBe(4500);
    });

    it('treats unusable values as zero rather than NaN', () => {
        expect(toCents(undefined, 'dollars')).toBe(0);
        expect(toCents(null, 'cents')).toBe(0);
        expect(toCents('not a number', 'dollars')).toBe(0);
    });
});

describe('normalizePayment', () => {
    it('reads the documented field names', () => {
        const payment = normalizePayment({
            id: 'pay_123',
            campaignId: 'camp_1',
            payerName: 'John Smith',
            payerEmail: 'John@Example.com',
            amount: 45,
            currency: 'CAD',
            status: 'succeeded',
            paidAt: '2026-02-01T12:00:00.000Z',
        });

        expect(payment).toMatchObject({
            id: 'pay_123',
            campaignId: 'camp_1',
            payerName: 'John Smith',
            amountCents: 4500,
            currency: 'cad',
            status: 'succeeded',
        });
        // Email is the matching key, so it is always normalised.
        expect(payment!.payerEmail).toBe('john@example.com');
    });

    it('accepts snake_case and nested spellings', () => {
        const payment = normalizePayment({
            payment_id: 'pay_456',
            campaign_id: 'camp_2',
            contact: { fullName: 'Mary Jones', email: 'mary@example.com' },
            total: 90,
        });

        expect(payment).toMatchObject({
            id: 'pay_456',
            campaignId: 'camp_2',
            payerName: 'Mary Jones',
            payerEmail: 'mary@example.com',
            amountCents: 9000,
        });
    });

    // The payer's name arrived blank in production because the reader took
    // `firstName` on its own and never looked inside a container. These are the
    // shapes that used to yield nothing or half a name.
    it('joins a name split across first and last', () => {
        const payment = normalizePayment({
            id: 'pay_789',
            firstName: 'Anne',
            lastName: 'Tremblay',
            email: 'anne@example.com',
            amount: 30,
        });

        expect(payment!.payerName).toBe('Anne Tremblay');
        expect(payment!.payerEmail).toBe('anne@example.com');
    });

    it('finds a split name nested under the payer', () => {
        const payment = normalizePayment({
            id: 'pay_790',
            donor: { first_name: 'Luc', last_name: 'Gagnon', emailAddress: 'LUC@example.com' },
            amount: 30,
        });

        expect(payment!.payerName).toBe('Luc Gagnon');
        expect(payment!.payerEmail).toBe('luc@example.com');
    });

    it('still yields a usable name when only one half is present', () => {
        expect(normalizePayment({ id: 'p', firstName: 'Madonna' })!.payerName).toBe('Madonna');
        expect(normalizePayment({ id: 'p', payer: { lastName: 'Cher' } })!.payerName).toBe('Cher');
    });

    it('prefers a whole name over the split halves', () => {
        const payment = normalizePayment({
            id: 'p',
            fullName: 'Jean-Guy St-Pierre',
            firstName: 'Jean',
            lastName: 'St-Pierre',
        });

        expect(payment!.payerName).toBe('Jean-Guy St-Pierre');
    });

    it('never returns an object where a name is expected', () => {
        // A `name` that is itself {first, last} must not stringify to
        // "[object Object]" in the reconcile queue.
        const payment = normalizePayment({
            id: 'p',
            contact: { name: { first: 'Ada', last: 'Lovelace' }, firstName: 'Ada', lastName: 'Lovelace' },
        });

        expect(payment!.payerName).toBe('Ada Lovelace');
    });

    it('reports no name rather than inventing one', () => {
        expect(normalizePayment({ id: 'p', amount: 45 })!.payerName).toBeNull();
        expect(normalizePayment({ id: 'p', amount: 45 })!.payerEmail).toBeNull();
    });

    it('prefers an explicit cents field over a dollars field', () => {
        // Both present: the cents field wins, so a $12.50 payment is never read
        // as $1250.
        expect(normalizePayment({ id: 'p', amountInCents: 1250, amount: 12.5 })!.amountCents).toBe(1250);
    });

    it('returns null without an id, since nothing can be verified', () => {
        expect(normalizePayment({ amount: 45 })).toBeNull();
        expect(normalizePayment(null as any)).toBeNull();
        expect(normalizePayment('nope' as any)).toBeNull();
    });

    it('keeps the untouched payload for debugging', () => {
        const raw = { id: 'p', amount: 45, somethingNew: { we: 'do not know about' } };
        expect(normalizePayment(raw)!.raw).toEqual(raw);
    });

    // A real Zeffy payment, copied from production: the buyer is nested under
    // `buyer`, the name is split, the amount is a genuinely free ticket, and the
    // timestamp is Unix seconds. This is the shape that first came back blank.
    it('reads a real Zeffy ticketing payment', () => {
        const payment = normalizePayment({
            id: 'c2463266-80e3-45b3-9bdd-84c0a9e3f54e',
            type: 'online',
            buyer: { email: 'john.mason@test-goodwood.ca', last_name: 'Mason', first_name: 'John' },
            items: [{ type: 'ticket', amount: 0 }],
            amount: 0,
            status: 'succeeded',
            created: 1786883039,
            currency: 'cad',
            campaign_id: 'baef7108-6916-4bd4-bb4d-a329e56a8f48',
        });

        expect(payment).toMatchObject({
            id: 'c2463266-80e3-45b3-9bdd-84c0a9e3f54e',
            payerName: 'John Mason',
            payerEmail: 'john.mason@test-goodwood.ca',
            amountCents: 0,
            campaignId: 'baef7108-6916-4bd4-bb4d-a329e56a8f48',
            status: 'succeeded',
        });
    });

    it('converts a Unix-seconds timestamp to ISO', () => {
        // 1786883039 is 2026-08-16T... — stored raw it would be a 1970 date.
        expect(normalizePayment({ id: 'p', created: 1786883039 })!.paidAt)
            .toBe(new Date(1786883039 * 1000).toISOString());
    });

    it('passes an ISO timestamp through', () => {
        expect(normalizePayment({ id: 'p', paidAt: '2026-02-01T12:00:00.000Z' })!.paidAt)
            .toBe('2026-02-01T12:00:00.000Z');
    });
});

describe('ticketQuantity', () => {
    it('counts the ticket line items', () => {
        expect(ticketQuantity({ items: [{ type: 'ticket' }, { type: 'ticket' }] })).toBe(2);
    });

    it('sums a per-line quantity when Zeffy carries one', () => {
        expect(ticketQuantity({ items: [{ type: 'ticket', quantity: 3 }] })).toBe(3);
    });

    it('falls back to one seat when there is no itemisation', () => {
        expect(ticketQuantity({ amount: 0 })).toBe(1);
        expect(ticketQuantity({ items: [] })).toBe(1);
    });

    it('ignores non-ticket line items like donations', () => {
        expect(ticketQuantity({ items: [{ type: 'ticket' }, { type: 'donation' }] })).toBe(1);
    });
});

describe('paymentFromWebhook', () => {
    it('unwraps the documented envelope', () => {
        const { event, payment } = paymentFromWebhook({
            event: 'payment.completed',
            timestamp: '2026-02-01T12:00:00.000Z',
            payment: { id: 'pay_1', amount: 45, payerEmail: 'a@b.co' },
        });
        expect(event).toBe('payment.completed');
        expect(payment).toMatchObject({ id: 'pay_1', amountCents: 4500 });
    });

    it('unwraps a data-wrapped envelope', () => {
        const { payment } = paymentFromWebhook({
            type: 'payment.completed',
            data: { id: 'pay_2', amount: 10 },
        });
        expect(payment).toMatchObject({ id: 'pay_2', amountCents: 1000 });
    });

    it('falls back to a bare payment object', () => {
        const { payment } = paymentFromWebhook({ id: 'pay_3', amount: 5 });
        expect(payment).toMatchObject({ id: 'pay_3', amountCents: 500 });
    });
});

describe('isCompleted', () => {
    const base = { id: 'p', campaignId: null, payerName: null, payerEmail: null, amountCents: 0, currency: 'cad', paidAt: null, raw: {} };

    it('accepts the states that mean money changed hands', () => {
        for (const status of ['succeeded', 'completed', 'complete', 'paid', 'SUCCESS']) {
            expect(isCompleted({ ...base, status })).toBe(true);
        }
    });

    it('rejects states that do not', () => {
        for (const status of ['pending', 'failed', 'refunded', 'cancelled']) {
            expect(isCompleted({ ...base, status })).toBe(false);
        }
    });

    it('trusts the event itself when no status is reported', () => {
        expect(isCompleted({ ...base, status: null })).toBe(true);
    });
});

describe('matchPaymentToOrder', () => {
    const payment = (overrides: Partial<ZeffyPayment> = {}): ZeffyPayment => ({
        id: 'pay_1', campaignId: 'camp_1', payerName: 'John Smith',
        payerEmail: 'john@example.com', amountCents: 4500, currency: 'cad',
        status: 'succeeded', paidAt: null, raw: {}, ...overrides,
    });

    const order = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
        id: 'o1', buyer_email: 'john@example.com', amount_cents: 4500,
        created_at: '2026-01-01T00:00:00.000Z', payment_status: 'pending',
        payment_method: 'zeffy', ...overrides,
    });

    it('matches one pending order on email and amount', () => {
        expect(matchPaymentToOrder(payment(), [order()])).toEqual({ orderId: 'o1', confidence: 'exact' });
    });

    it('ignores case and padding in the email', () => {
        expect(
            matchPaymentToOrder(payment(), [order({ buyer_email: '  John@Example.COM ' })]),
        ).toEqual({ orderId: 'o1', confidence: 'exact' });
    });

    it('allows a Zeffy tip on top of the ticket price', () => {
        // Zeffy asks buyers for a voluntary contribution, so paying more than the
        // ticket price is normal and must still match.
        expect(matchPaymentToOrder(payment({ amountCents: 5000 }), [order()]))
            .toEqual({ orderId: 'o1', confidence: 'exact' });
    });

    it('refuses to match when the amount falls short', () => {
        // Underpayment means something is wrong — a human should look.
        expect(matchPaymentToOrder(payment({ amountCents: 2000 }), [order()]))
            .toEqual({ orderId: null, confidence: null });
    });

    it('refuses to match a different payer', () => {
        expect(matchPaymentToOrder(payment({ payerEmail: 'someone@else.com' }), [order()]))
            .toEqual({ orderId: null, confidence: null });
    });

    it('refuses to match when the payment carries no email', () => {
        expect(matchPaymentToOrder(payment({ payerEmail: null }), [order()]))
            .toEqual({ orderId: null, confidence: null });
    });

    it('never touches an order that is already paid', () => {
        expect(matchPaymentToOrder(payment(), [order({ payment_status: 'paid' })]))
            .toEqual({ orderId: null, confidence: null });
    });

    it('never touches an e-transfer or cash order', () => {
        expect(matchPaymentToOrder(payment(), [order({ payment_method: 'etransfer' })]))
            .toEqual({ orderId: null, confidence: null });
        expect(matchPaymentToOrder(payment(), [order({ payment_method: 'cash' })]))
            .toEqual({ orderId: null, confidence: null });
    });

    it('takes the oldest when one person has several eligible orders', () => {
        const result = matchPaymentToOrder(payment({ amountCents: 9000 }), [
            order({ id: 'newer', created_at: '2026-01-05T00:00:00.000Z' }),
            order({ id: 'older', created_at: '2026-01-02T00:00:00.000Z' }),
        ]);
        expect(result).toEqual({ orderId: 'older', confidence: 'email_amount' });
    });

    it('returns nothing when there are no candidates at all', () => {
        expect(matchPaymentToOrder(payment(), [])).toEqual({ orderId: null, confidence: null });
    });
});
