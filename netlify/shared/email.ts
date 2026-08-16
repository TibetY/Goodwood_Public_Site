// Branded transactional email, sent via Resend.
//
// The visual template matches the one already used by
// netlify/functions/submit-contact.ts: cream page, white card, navy #1b2a4a
// header band, gold #c9a548 eyebrow, label/value rows on hairline dividers.

export interface EmailAttachment {
  filename: string;
  /** base64-encoded file content */
  content: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Cents to a display string: 4500 → "$45.00". Integer cents only, never floats. */
export const formatMoney = (cents: number) =>
  `$${(Math.round(cents) / 100).toFixed(2)}`;

export const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2d6;vertical-align:top;width:140px;">
        <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a7f6a;">${escapeHtml(label)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2d6;font-size:15px;color:#1f2a37;">${value}</td>
    </tr>`;

export interface BrandedEmailInput {
  heading: string;
  /** Optional lead paragraph above the detail rows. Plain text; escaped. */
  intro?: string;
  /** Pre-rendered <tr> markup, e.g. from row(). Values are NOT escaped here. */
  rows?: string;
  /** Optional raw HTML block below the rows (callouts, QR image, buttons). */
  body?: string;
  footer?: string;
}

/**
 * Build the full HTML document for a lodge email.
 *
 * NOTE ON ESCAPING: `rows` and `body` are inserted raw so callers can embed
 * links and images. Every piece of buyer-supplied text put into them must be
 * passed through escapeHtml() first — buyer names land in an inbox belonging to
 * a Lodge officer, so this is a live XSS path, not a theoretical one.
 */
export function brandedEmail({ heading, intro, rows: rowsHtml, body, footer }: BrandedEmailInput): string {
  return `
  <div style="background-color:#f4f1ea;padding:32px 0;font-family:'Public Sans',Helvetica,Arial,sans-serif;">
    <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e7e2d6;border-radius:6px;overflow:hidden;">
      <tr>
        <td style="background-color:#1b2a4a;padding:28px 32px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#c9a548;">Goodwood Lodge No. 159</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#ffffff;margin-top:6px;">${escapeHtml(heading)}</div>
        </td>
      </tr>
      ${intro ? `<tr><td style="padding:24px 32px 0;font-size:15px;line-height:1.65;color:#1f2a37;">${escapeHtml(intro)}</td></tr>` : ''}
      ${rowsHtml ? `<tr><td style="padding:16px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table></td></tr>` : ''}
      ${body ? `<tr><td style="padding:16px 32px 8px;">${body}</td></tr>` : ''}
      ${footer ? `<tr><td style="padding:8px 32px 28px;"><div style="font-size:12px;color:#8a7f6a;line-height:1.6;">${escapeHtml(footer)}</div></td></tr>` : ''}
    </table>
  </div>`;
}

/** A prominent callout block — used for the e-transfer memo and cash amount. */
export const callout = (label: string, value: string, tone: 'gold' | 'navy' = 'gold') => {
  const border = tone === 'gold' ? '#c9a548' : '#1b2a4a';
  return `
    <div style="border:2px solid ${border};border-radius:4px;padding:16px;text-align:center;background-color:#f9f7f1;">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a7f6a;">${escapeHtml(label)}</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#1b2a4a;margin-top:6px;letter-spacing:0.04em;">${escapeHtml(value)}</div>
    </div>`;
};

/**
 * Send through Resend. Returns false (and logs) rather than throwing, because
 * every caller must be able to complete its primary job — recording a payment —
 * even when email delivery fails.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('email: RESEND_API_KEY is not set — skipping send');
    return false;
  }

  const from =
    process.env.TICKETS_EMAIL_FROM ||
    process.env.CONTACT_EMAIL_FROM ||
    'Goodwood Lodge Website <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      }),
    });

    if (!res.ok) {
      console.error('email: Resend API error', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('email: send failed', err);
    return false;
  }
}
