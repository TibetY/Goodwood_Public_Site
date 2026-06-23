import { describe, it, expect } from 'vitest';
import {
  eventDateCard,
  eventTimeLabel,
  eventMonthYear,
  eventYear,
  eventMonthIndex,
  eventTimestamp,
  MONTH_NAMES,
  type LodgeEvent,
} from './events';

function makeEvent(overrides: Partial<LodgeEvent> = {}): LodgeEvent {
  return {
    id: '1',
    title: 'Regular Meeting',
    start: '2025-03-04T19:30:00-05:00',
    end: null,
    allDay: false,
    location: 'Lodge Hall',
    description: '',
    htmlLink: '',
    ...overrides,
  };
}

describe('events date helpers', () => {
  it('MONTH_NAMES has 12 full month names', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('January');
    expect(MONTH_NAMES[11]).toBe('December');
  });

  it('eventYear / eventMonthIndex read the start date', () => {
    const ev = makeEvent({ start: '2024-11-19T19:30:00-05:00' });
    expect(eventYear(ev)).toBe(2024);
    expect(eventMonthIndex(ev)).toBe(10); // November = index 10
  });

  it('eventMonthYear renders a short label', () => {
    expect(eventMonthYear(makeEvent({ start: '2025-05-06T19:30:00-04:00' }))).toBe('May 2025');
  });

  it('eventTimestamp is sortable and ordered chronologically', () => {
    const earlier = eventTimestamp(makeEvent({ start: '2025-01-01T10:00:00-05:00' }));
    const later = eventTimestamp(makeEvent({ start: '2025-12-01T10:00:00-05:00' }));
    expect(earlier).toBeLessThan(later);
  });

  it('eventDateCard zero-pads the day and uses a short month', () => {
    const { day, month } = eventDateCard(makeEvent({ start: '2025-03-04T19:30:00-05:00' }));
    expect(day).toBe('04');
    expect(month).toBe('Mar');
  });

  it('treats all-day (YYYY-MM-DD) values as local dates, not UTC', () => {
    // A naive new Date('2025-03-01') parses as UTC midnight, which is the
    // previous day in America/Toronto. The all-day path must avoid that.
    const ev = makeEvent({ start: '2025-03-01', allDay: true, end: null });
    expect(eventMonthIndex(ev)).toBe(2); // March
    expect(eventDateCard(ev).day).toBe('01');
  });

  it('eventTimeLabel returns "All day" for all-day events', () => {
    expect(eventTimeLabel(makeEvent({ allDay: true }))).toBe('All day');
  });
});
