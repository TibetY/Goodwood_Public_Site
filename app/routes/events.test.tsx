import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Events from './events';
import type { EventsResponse, LodgeEvent } from '../utils/events';

const now = new Date();

// A few hours from now: still in the current month, but in the future, so it
// lands only in the current-month list (not also in the recent-past recap).
const upcomingThisMonth = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

function makeEvent(overrides: Partial<LodgeEvent>): LodgeEvent {
  return {
    id: 'x', title: 'Event', start: upcomingThisMonth, end: null, allDay: false,
    location: '', description: '', htmlLink: '', ...overrides,
  };
}

function mockEvents(payload: EventsResponse) {
  vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('Events page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an event for the current month from the API', async () => {
    mockEvents({
      upcoming: [makeEvent({ id: '1', title: 'Test Lodge Meeting', })],
      past: [],
      configured: true,
    });
    renderWithProviders(<Events />, { route: '/events' });
    expect(await screen.findByText('Test Lodge Meeting')).toBeInTheDocument();
  });

  it('does not show events outside the default (current) month', async () => {
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 15, 19, 30).toISOString();
    mockEvents({
      upcoming: [],
      past: [makeEvent({ id: '2', title: 'Old Meeting', start: lastYear })],
      configured: true,
    });
    renderWithProviders(<Events />, { route: '/events' });

    expect(await screen.findByText(/no events scheduled for/i)).toBeInTheDocument();
    expect(screen.queryByText('Old Meeting')).toBeNull();
  });

  it('has no detectable accessibility violations in list view', async () => {
    mockEvents({
      upcoming: [makeEvent({ id: '1', title: 'Test Lodge Meeting', })],
      past: [],
      configured: true,
    });
    const { container } = renderWithProviders(<Events />, { route: '/events' });
    await screen.findByText('Test Lodge Meeting');
    expect(await axe(container)).toHaveNoViolations();
  });
});
