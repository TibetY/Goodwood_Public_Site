import type { Handler } from '@netlify/functions';

// Proxies the Google Calendar API v3 so the API key stays server-side.
// Requires two environment variables:
//   VITE_GOOGLE_CAL_API_KEY  — a Google Cloud API key with the Calendar API enabled
//   VITE_GOOGLE_CAL_ID       — the calendar's ID (e.g. xxxxx@group.calendar.google.com)
// The calendar must be public ("Make available to public") for an API key to read it.

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const mapEvent = (e: GCalEvent) => {
  const allDay = Boolean(e.start?.date);
  return {
    id: e.id,
    title: e.summary || 'Lodge Event',
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || null,
    allDay,
    location: e.location || '',
    description: e.description || '',
    htmlLink: e.htmlLink || '',
  };
};

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 minutes
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.VITE_GOOGLE_CAL_API_KEY;
  const calendarId = process.env.VITE_GOOGLE_CAL_ID;

  // Not configured yet — respond gracefully so the UI can show a fallback.
  if (!apiKey || !calendarId) {
    return { statusCode: 200, headers, body: JSON.stringify({ upcoming: [], past: [], configured: false }) };
  }

  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const upcomingUrl =
    `${base}?key=${apiKey}&singleEvents=true&orderBy=startTime&maxResults=25` +
    `&timeMin=${encodeURIComponent(now.toISOString())}`;

  const pastUrl =
    `${base}?key=${apiKey}&singleEvents=true&orderBy=startTime&maxResults=250` +
    `&timeMin=${encodeURIComponent(oneYearAgo.toISOString())}` +
    `&timeMax=${encodeURIComponent(now.toISOString())}`;

  try {
    const [upcomingRes, pastRes] = await Promise.all([fetch(upcomingUrl), fetch(pastUrl)]);

    if (!upcomingRes.ok || !pastRes.ok) {
      const detail = await (upcomingRes.ok ? pastRes : upcomingRes).text();
      console.error('Google Calendar API error:', detail);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Calendar request failed', upcoming: [], past: [], configured: true }) };
    }

    const upcomingJson = await upcomingRes.json();
    const pastJson = await pastRes.json();

    const upcoming = (upcomingJson.items || []).map(mapEvent);
    // Past events come back ascending; show most-recent first and cap the list.
    const past = (pastJson.items || []).map(mapEvent).reverse().slice(0, 8);

    return { statusCode: 200, headers, body: JSON.stringify({ upcoming, past, configured: true }) };
  } catch (err: any) {
    console.error('list-events error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', upcoming: [], past: [], configured: true }) };
  }
};
