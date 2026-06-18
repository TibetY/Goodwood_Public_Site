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
  const submittedAt = new Date().toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2d6;vertical-align:top;width:120px;">
        <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a7f6a;">${label}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2d6;font-size:15px;color:#1f2a37;">${value}</td>
    </tr>`;

  const html = `
  <div style="background-color:#f4f1ea;padding:32px 0;font-family:'Public Sans',Helvetica,Arial,sans-serif;">
    <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e7e2d6;border-radius:6px;overflow:hidden;">
      <tr>
        <td style="background-color:#1b2a4a;padding:28px 32px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#c9a548;">Goodwood Lodge No. 159</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#ffffff;margin-top:6px;">New Contact Submission</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', escapeHtml(fullName))}
            ${row('Email', `<a href="mailto:${escapeHtml(email)}" style="color:#1b2a4a;">${escapeHtml(email)}</a>`)}
            ${row('Phone', phone ? `<a href="tel:${escapeHtml(phone)}" style="color:#1b2a4a;">${escapeHtml(phone)}</a>` : '&mdash;')}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 24px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a7f6a;margin-bottom:8px;">Message</div>
          <div style="font-size:15px;line-height:1.65;color:#1f2a37;background-color:#f9f7f1;border:1px solid #e7e2d6;border-radius:4px;padding:16px;">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 28px;">
          <div style="font-size:12px;color:#8a7f6a;">Submitted ${escapeHtml(submittedAt)} &middot; Reply directly to this email to respond to ${escapeHtml(firstName)}.</div>
        </td>
      </tr>
    </table>
  </div>`;

  const text =
    `New contact submission — Goodwood Lodge No. 159\n\n` +
    `Name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || '—'}\n\n` +
    `Message:\n${message}\n\n` +
    `Submitted ${submittedAt}`;

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
        subject: `Website Enquiry — ${fullName}`,
        html,
        text,
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
