import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockFetchRoutes, makeAuth } from '../../../test/utils';
import type { Order, OrderSummary, TicketedEvent } from '../../utils/tickets';

// The portal pages are the first tested components that need auth, and the real
// AuthProvider talks to Supabase on mount — so the hook is mocked instead.
const authState = { current: makeAuth({ roles: ['event_admin'] }) };

vi.mock('../../context/auth-context', () => ({
    useAuth: () => authState.current,
}));

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router');
    return { ...actual, useParams: () => ({ eventId: 'e1' }) };
});

const { default: EventOrders } = await import('./eventOrders');

const event: TicketedEvent = {
    id: 'e1', slug: 'burns-night', title: 'Burns Night Dinner', description: '', location: 'Lodge Hall',
    starts_at: '2026-02-14T23:30:00.000Z', ends_at: null, gcal_event_id: null,
    price_cents: 4500, currency: 'cad', capacity: 60, max_per_order: 10,
    sales_open_at: null, sales_close_at: null,
    allow_zeffy: false, zeffy_form_url: null, zeffy_campaign_id: null,
    allow_etransfer: true, allow_cash: true,
    etransfer_email: null, etransfer_instructions: '', etransfer_hold_hours: 72,
    refund_policy: '', published: true,
};

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'o1', event_id: 'e1', reference: 'GW-7K3M9Q',
        buyer_name: 'John Smith', buyer_email: 'john@example.com', buyer_phone: null, notes: '',
        quantity: 2, unit_price_cents: 4500, amount_cents: 9000,
        payment_method: 'etransfer', payment_status: 'pending', payment_reference: null,
        hold_expires_at: new Date(Date.now() + 864e5).toISOString(), paid_at: null,
        refunded_amount_cents: 0, checked_in_at: null, checked_in_count: 0,
        created_at: '2026-01-02T10:00:00.000Z',
        ...overrides,
    };
}

const summary: OrderSummary = {
    orderCount: 2, seatsTaken: 4, seatsPaid: 2, checkedIn: 0,
    paidCents: 9000, outstandingCents: 9000, refundedCents: 0,
    byMethod: {
        zeffy: { orders: 0, seats: 0, paidCents: 0, outstandingCents: 0 },
        etransfer: { orders: 1, seats: 2, paidCents: 0, outstandingCents: 9000 },
        cash: { orders: 1, seats: 2, paidCents: 9000, outstandingCents: 0 },
    },
};

const orders = [
    makeOrder(),
    makeOrder({
        id: 'o2', reference: 'GW-PAID01', buyer_name: 'Mary Jones', buyer_email: 'mary@example.com',
        payment_method: 'cash', payment_status: 'paid', paid_at: '2026-01-03T10:00:00.000Z',
        hold_expires_at: null,
    }),
];

const renderPage = () => {
    mockFetchRoutes({ 'admin-list-orders': { event, orders, summary } });
    return renderWithProviders(<EventOrders />, { route: '/portal/events/e1/orders' });
};

describe('Event payments tracker', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        authState.current = makeAuth({ roles: ['event_admin'] });
    });

    it('lists each order with its buyer, method and status', async () => {
        renderPage();

        expect(await screen.findByText('GW-7K3M9Q')).toBeInTheDocument();
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Mary Jones')).toBeInTheDocument();
        expect(screen.getByText('E-Transfer')).toBeInTheDocument();
        expect(screen.getByText('Cash')).toBeInTheDocument();
        expect(screen.getByText('Awaiting payment')).toBeInTheDocument();

        // "Paid" is also a column header, so scope the status assertion to the body.
        const body = screen.getAllByRole('rowgroup')[1];
        expect(within(body).getByText('Paid')).toBeInTheDocument();
    });

    it('shows collected and outstanding totals', async () => {
        renderPage();

        await screen.findByText('GW-7K3M9Q');
        expect(screen.getByText('Collected')).toBeInTheDocument();
        expect(screen.getByText('Outstanding')).toBeInTheDocument();
        // $90.00 appears as both the collected and the outstanding total here.
        expect(screen.getAllByText('$90.00').length).toBeGreaterThanOrEqual(2);
    });

    it('filters to unpaid orders', async () => {
        const user = userEvent.setup();
        renderPage();

        await screen.findByText('GW-7K3M9Q');
        await user.click(screen.getByRole('button', { name: 'Unpaid' }));

        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.queryByText('Mary Jones')).not.toBeInTheDocument();
    });

    it('searches by name, email or reference', async () => {
        const user = userEvent.setup();
        renderPage();

        await screen.findByText('GW-7K3M9Q');
        await user.type(screen.getByPlaceholderText(/Search name, email or reference/i), 'mary@');

        expect(screen.getByText('Mary Jones')).toBeInTheDocument();
        expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });

    it('marks an order paid through the admin endpoint', async () => {
        const user = userEvent.setup();
        const fetchSpy = mockFetchRoutes({
            'admin-list-orders': { event, orders, summary },
            'admin-update-order': { order: makeOrder({ payment_status: 'paid' }) },
        });
        renderWithProviders(<EventOrders />, { route: '/portal/events/e1/orders' });

        await screen.findByText('GW-7K3M9Q');
        await user.click(screen.getByRole('button', { name: 'Mark as paid' }));
        await user.click(await screen.findByRole('button', { name: 'Mark Paid' }));

        await waitFor(() => {
            expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('admin-update-order'))).toBe(true);
        });

        const call = fetchSpy.mock.calls.find(([url]) => String(url).includes('admin-update-order'))!;
        expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({
            orderId: 'o1',
            action: 'mark_paid',
            paymentMethod: 'etransfer',
        });
    });

    it('shows a hold as expired once it has lapsed', async () => {
        mockFetchRoutes({
            'admin-list-orders': {
                event,
                orders: [makeOrder({ hold_expires_at: '2020-01-01T00:00:00.000Z' })],
                summary,
            },
        });
        renderWithProviders(<EventOrders />, { route: '/portal/events/e1/orders' });

        expect(await screen.findByText('Hold expired')).toBeInTheDocument();
    });

    it('refuses to show payment data without the event_admin role', async () => {
        authState.current = makeAuth({ roles: [] });
        const fetchSpy = mockFetchRoutes({ 'admin-list-orders': { event, orders, summary } });
        renderWithProviders(<EventOrders />, { route: '/portal/events/e1/orders' });

        expect(await screen.findByText(/need the Event Admin role/i)).toBeInTheDocument();
        expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
        // The page must not even request the data it may not display.
        expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('admin-list-orders'))).toBe(false);
    });

    it('has no detectable accessibility violations', async () => {
        const { container } = renderPage();
        await screen.findByText('GW-7K3M9Q');
        expect(await axe(container)).toHaveNoViolations();
    });
});
