import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockFetchRoutes } from '../../../test/utils';
import BuyTickets from './buyTickets';
import type { TicketedEvent } from '../../utils/tickets';

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router');
    return { ...actual, useParams: () => ({ slug: 'burns-night' }) };
});

function makeEvent(overrides: Partial<TicketedEvent> = {}): TicketedEvent {
    return {
        id: 'e1', slug: 'burns-night', title: 'Burns Night Dinner', description: 'An evening of haggis.',
        location: 'Lodge Hall', starts_at: new Date(Date.now() + 7 * 864e5).toISOString(), ends_at: null,
        gcal_event_id: null, price_cents: 4500, currency: 'cad', capacity: null, max_per_order: 10,
        sales_open_at: null, sales_close_at: null,
        allow_zeffy: false, zeffy_form_url: null, zeffy_campaign_id: null,
        allow_etransfer: true, allow_cash: true,
        etransfer_email: 'treasurer@goodwood159.ca', etransfer_instructions: '', etransfer_hold_hours: 72,
        refund_policy: '', published: true, seats_remaining: null,
        ...overrides,
    };
}

const renderPage = (event: TicketedEvent, extra: Record<string, unknown> = {}) => {
    mockFetchRoutes({ 'get-ticketed-event': { event }, ...extra });
    return renderWithProviders(<BuyTickets />, { route: '/events/burns-night/tickets' });
};

describe('Buy tickets page', () => {
    beforeEach(() => { vi.restoreAllMocks(); });

    it('shows the event, its price and the available payment methods', async () => {
        renderPage(makeEvent());

        expect(await screen.findByText('Burns Night Dinner')).toBeInTheDocument();
        expect(screen.getByText('$45.00 per ticket')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Interac e-Transfer/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cash at the door/i })).toBeInTheDocument();
    });

    it('hides the card option when the event does not allow it', async () => {
        renderPage(makeEvent({ allow_zeffy: false }));

        await screen.findByText('Burns Night Dinner');
        expect(screen.queryByRole('button', { name: /Credit \/ debit card/i })).not.toBeInTheDocument();
    });

    it('offers the card option when the event allows it', async () => {
        renderPage(makeEvent({ allow_zeffy: true, zeffy_form_url: 'https://www.zeffy.com/ticketing/burns-night' }));

        expect(await screen.findByRole('button', { name: /Credit \/ debit card/i })).toBeInTheDocument();
    });

    it('replaces the form with a sold-out notice at zero seats', async () => {
        renderPage(makeEvent({ capacity: 40, seats_remaining: 0 }));

        expect(await screen.findByText(/This event is sold out/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Reserve tickets/i })).not.toBeInTheDocument();
    });

    it('warns about low stock only when few seats remain', async () => {
        renderPage(makeEvent({ capacity: 40, seats_remaining: 4 }));
        expect(await screen.findByText('Only 4 left')).toBeInTheDocument();
    });

    it('does not submit when the email is invalid', async () => {
        const user = userEvent.setup();
        const fetchSpy = mockFetchRoutes({ 'get-ticketed-event': { event: makeEvent() } });
        renderWithProviders(<BuyTickets />, { route: '/events/burns-night/tickets' });

        await screen.findByText('Burns Night Dinner');
        await user.type(screen.getByLabelText(/Full name/i), 'John Smith');
        await user.type(screen.getByLabelText(/^Email/i), 'john@nodot');
        await user.click(screen.getByRole('button', { name: /Interac e-Transfer/i }));
        await user.click(screen.getByRole('button', { name: /Reserve tickets/i }));

        expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
        expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('create-order'))).toBe(false);
    });

    it('does not submit until a payment method is chosen', async () => {
        const user = userEvent.setup();
        const fetchSpy = mockFetchRoutes({ 'get-ticketed-event': { event: makeEvent() } });
        renderWithProviders(<BuyTickets />, { route: '/events/burns-night/tickets' });

        await screen.findByText('Burns Night Dinner');
        await user.type(screen.getByLabelText(/Full name/i), 'John Smith');
        await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');
        await user.click(screen.getByRole('button', { name: /Reserve tickets/i }));

        expect(await screen.findByText('Please choose how you would like to pay.')).toBeInTheDocument();
        expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('create-order'))).toBe(false);
    });

    it('posts the order and never sends a price from the browser', async () => {
        const user = userEvent.setup();
        const fetchSpy = mockFetchRoutes({
            'get-ticketed-event': { event: makeEvent() },
            'create-order': { reference: 'GW-ABC234', token: 'tok123' },
        });
        renderWithProviders(<BuyTickets />, { route: '/events/burns-night/tickets' });

        await screen.findByText('Burns Night Dinner');
        await user.type(screen.getByLabelText(/Full name/i), 'John Smith');
        await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');
        await user.click(screen.getByRole('button', { name: /Interac e-Transfer/i }));
        await user.click(screen.getByRole('button', { name: /Reserve tickets/i }));

        await waitFor(() => {
            expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('create-order'))).toBe(true);
        });

        const call = fetchSpy.mock.calls.find(([url]) => String(url).includes('create-order'))!;
        const body = JSON.parse((call[1] as RequestInit).body as string);

        expect(body).toMatchObject({
            eventId: 'e1',
            quantity: 1,
            buyerName: 'John Smith',
            buyerEmail: 'john@example.com',
            paymentMethod: 'etransfer',
        });
        // The server reads the price from the database; trusting a browser-sent
        // amount is the classic ticketing vulnerability.
        expect(body).not.toHaveProperty('amount_cents');
        expect(body).not.toHaveProperty('price_cents');
        // Spam defences travel with every submission.
        expect(body).toHaveProperty('botField');
        expect(body).toHaveProperty('elapsedMs');
    });

    it('has no detectable accessibility violations', async () => {
        const { container } = renderPage(makeEvent());
        await screen.findByText('Burns Night Dinner');
        expect(await axe(container)).toHaveNoViolations();
    });
});
