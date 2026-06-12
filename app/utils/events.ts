// Shared types + client helpers for lodge events sourced from Google Calendar.
// The data is fetched from the `list-events` Netlify function, which proxies the
// Google Calendar API v3 (keeps the API key server-side).

export interface LodgeEvent {
    id: string;
    title: string;
    start: string;      // ISO timestamp (or YYYY-MM-DD for all-day)
    end: string | null; // ISO timestamp (or null)
    allDay: boolean;
    location: string;
    description: string;
    htmlLink: string;
}

export interface EventsResponse {
    upcoming: LodgeEvent[];
    past: LodgeEvent[];
    configured: boolean; // false when the calendar env vars are not set
}

export async function fetchEvents(): Promise<EventsResponse> {
    const res = await fetch('/.netlify/functions/list-events');
    if (!res.ok) {
        throw new Error('Failed to load events');
    }
    return res.json();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse an event start, treating all-day (YYYY-MM-DD) values as local dates. */
function toDate(value: string, allDay: boolean): Date {
    if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(value);
}

/** Big date-card pieces: { day: "27", month: "Jun" }. */
export function eventDateCard(ev: LodgeEvent): { day: string; month: string } {
    const date = toDate(ev.start, ev.allDay);
    return { day: String(date.getDate()).padStart(2, '0'), month: MONTHS[date.getMonth()] };
}

/** Human time + month/year label, e.g. "7:30 PM" or "All day". */
export function eventTimeLabel(ev: LodgeEvent): string {
    if (ev.allDay) return 'All day';
    const date = toDate(ev.start, ev.allDay);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "May 2025" style label, used for the Past Events list. */
export function eventMonthYear(ev: LodgeEvent): string {
    const date = toDate(ev.start, ev.allDay);
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
