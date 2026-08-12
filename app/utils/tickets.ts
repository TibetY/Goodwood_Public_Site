// Shared types + client helpers for ticketed events and orders.
//
// Mirrors app/utils/events.ts. Everything below the fetch helpers is pure, so
// the money and availability rules — the parts a mistake actually costs money —
// are unit-testable without a network or a database.

export type PaymentMethod = 'stripe' | 'etransfer' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled' | 'expired';

export interface TicketedEvent {
    id: string;
    slug: string;
    title: string;
    description: string;
    location: string;
    starts_at: string;
    ends_at: string | null;
    gcal_event_id: string | null;
    price_cents: number;
    currency: string;
    capacity: number | null;
    max_per_order: number;
    sales_open_at: string | null;
    sales_close_at: string | null;
    allow_stripe: boolean;
    allow_etransfer: boolean;
    allow_cash: boolean;
    etransfer_email: string | null;
    etransfer_instructions: string;
    etransfer_hold_hours: number;
    refund_policy: string;
    published: boolean;
    /** Present on the public listing only. */
    seats_remaining?: number | null;
}

export interface EventStats {
    seatsTaken: number;
    paidCents: number;
    outstandingCents: number;
    orderCount: number;
}

export interface TicketedEventWithStats extends TicketedEvent {
    stats: EventStats;
}

export interface Order {
    id: string;
    event_id: string;
    reference: string;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string | null;
    notes: string;
    quantity: number;
    unit_price_cents: number;
    amount_cents: number;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    payment_reference: string | null;
    hold_expires_at: string | null;
    paid_at: string | null;
    refunded_amount_cents: number;
    checkin_token?: string;
    checked_in_at: string | null;
    checked_in_count: number;
    created_at: string;
}

export interface OrderSummary {
    orderCount: number;
    seatsTaken: number;
    seatsPaid: number;
    checkedIn: number;
    paidCents: number;
    outstandingCents: number;
    refundedCents: number;
    byMethod: Record<PaymentMethod, { orders: number; seats: number; paidCents: number; outstandingCents: number }>;
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

export async function fetchTicketedEvents(): Promise<TicketedEvent[]> {
    const res = await fetch('/.netlify/functions/list-ticketed-events');
    if (!res.ok) throw new Error('Failed to load ticketed events');
    const data = await res.json();
    return data.events ?? [];
}

export async function fetchTicketedEvent(slug: string): Promise<TicketedEvent> {
    const res = await fetch(`/.netlify/functions/get-ticketed-event?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Failed to load event');
    const data = await res.json();
    return data.event;
}

export async function fetchOrder(token: string): Promise<{ order: Order; event: TicketedEvent }> {
    const res = await fetch(`/.netlify/functions/get-order?t=${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error('Failed to load order');
    return res.json();
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Cents to a display string: 4500 → "$45.00". Integer cents only, no floats. */
export function formatMoney(cents: number): string {
    return `$${(Math.round(cents) / 100).toFixed(2)}`;
}

/** Seats still available, or null when the event has no capacity limit. */
export function seatsRemaining(ev: Pick<TicketedEvent, 'capacity' | 'seats_remaining'>): number | null {
    if (ev.capacity === null || ev.capacity === undefined) return null;
    if (typeof ev.seats_remaining === 'number') return Math.max(0, ev.seats_remaining);
    return null;
}

export function isSoldOut(ev: Pick<TicketedEvent, 'capacity' | 'seats_remaining'>): boolean {
    return seatsRemaining(ev) === 0;
}

/**
 * Show a scarcity chip only when stock is genuinely low. "3 of 200 sold" reads
 * as a failure; "6 seats left" creates urgency.
 */
export function shouldShowSeatsLeft(ev: Pick<TicketedEvent, 'capacity' | 'seats_remaining'>): boolean {
    const remaining = seatsRemaining(ev);
    if (remaining === null || !ev.capacity) return false;
    return remaining > 0 && remaining / ev.capacity <= 0.2;
}

/** Whether tickets can be bought right now. `now` is injectable for tests. */
export function isOnSale(ev: TicketedEvent, now: Date = new Date()): boolean {
    if (!ev.published) return false;
    const t = now.getTime();
    if (ev.sales_open_at && t < new Date(ev.sales_open_at).getTime()) return false;
    if (ev.sales_close_at && t > new Date(ev.sales_close_at).getTime()) return false;
    if (isSoldOut(ev)) return false;
    return true;
}

/** Payment methods a buyer may choose for this event, in display order. */
export function availableMethods(ev: TicketedEvent): PaymentMethod[] {
    const methods: PaymentMethod[] = [];
    if (ev.allow_stripe) methods.push('stripe');
    if (ev.allow_etransfer) methods.push('etransfer');
    if (ev.allow_cash) methods.push('cash');
    return methods;
}

/** Largest quantity a buyer may select: their per-order cap, capped by stock. */
export function maxSelectableQuantity(ev: TicketedEvent): number {
    const remaining = seatsRemaining(ev);
    const cap = ev.max_per_order || 10;
    return remaining === null ? cap : Math.max(0, Math.min(cap, remaining));
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    stripe: 'Card',
    etransfer: 'E-Transfer',
    cash: 'Cash',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'Awaiting payment',
    paid: 'Paid',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
    expired: 'Expired',
};

/** MUI Chip colour for an order status. */
export function statusColor(status: PaymentStatus): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
        case 'paid': return 'success';
        case 'pending': return 'warning';
        case 'refunded': return 'error';
        default: return 'default';
    }
}

/** True when a pending order's hold has lapsed, so it no longer holds a seat. */
export function isHoldExpired(order: Pick<Order, 'payment_status' | 'hold_expires_at'>, now: Date = new Date()): boolean {
    if (order.payment_status !== 'pending' || !order.hold_expires_at) return false;
    return new Date(order.hold_expires_at).getTime() <= now.getTime();
}

/** "Sat, 14 Feb 2026, 6:30 p.m." in lodge-local time. */
export function formatEventDate(iso: string): string {
    return new Date(iso).toLocaleString('en-CA', {
        timeZone: 'America/Toronto',
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
