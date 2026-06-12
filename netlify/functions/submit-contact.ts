import type { Handler } from '@netlify/functions';

// Receives contact-form submissions and emails them via Resend.
// Requires two environment variables:
//   RESEND_API_KEY    — API key from resend.com
//   CONTACT_EMAIL_TO  — address that receives the submissions
// Optional:
//   CONTACT_EMAIL_FROM — verified sender (defaults to onboarding@resend.dev,
//                        which only delivers to the Resend account owner's
//                        address until a domain is verified)

interface ContactPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  message?: string;
  botField?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const handler: Handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  if (!apiKey || !to) {
    console.error('submit-contact: RESEND_API_KEY or CONTACT_EMAIL_TO is not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Contact form is not configured' }) };
  }

  let payload: ContactPayload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // Honeypot — silently accept bot submissions without sending anything.
  if (payload.botField) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const firstName = (payload.firstName || '').trim();
  const lastName = (payload.lastName || '').trim();
  const phone = (payload.phone || '').trim();
  const email = (payload.email || '').trim();
  const message = (payload.message || '').trim();

  if (!firstName || !lastName || !email || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  if (message.length > 5000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message too long' }) };
  }

  const fullName = `${firstName} ${lastName}`;
  const html = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_EMAIL_FROM || 'Goodwood Lodge Website <onboarding@resend.dev>',
        to: [to],
        reply_to: email,
        subject: `Contact form: ${fullName}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend API error:', res.status, detail);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to send message' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('submit-contact error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
