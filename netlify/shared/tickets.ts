// Ticket-specific server helpers: QR generation and the buyer-facing emails.

import QRCode from 'qrcode';
import { brandedEmail, callout, escapeHtml, formatMoney, row, sendEmail } from './email';
import { siteUrl } from './orders';

export interface TicketedEventRecord {
  id: string;
  slug: string;
  title: string;
  location: string;
  starts_at: string;
  price_cents: number;
  etransfer_email: string | null;
  etransfer_instructions: string;
  refund_policy: string;
}

export interface OrderRecord {
  id: string;
  reference: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  amount_cents: number;
  payment_method: 'stripe' | 'etransfer' | 'cash';
  payment_status: string;
  checkin_token: string;
  hold_expires_at: string | null;
}

/** The URL encoded in the QR. Opening it with any phone camera works — that is
 *  the point: the doorkeeper needs no app and no scanner library. */
export const ticketUrl = (token: string) => `${siteUrl()}/t/${token}`;

/** Server-rendered QR endpoint, used as the <img> source inside the email. */
export const ticketQrUrl = (token: string) =>
  `${siteUrl()}/.netlify/functions/ticket-qr?t=${encodeURIComponent(token)}`;

export async function qrPngBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketUrl(token), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'full',
    timeStyle: 'short',
  });

const METHOD_LABELS: Record<OrderRecord['payment_method'], string> = {
  stripe: 'Credit/debit card',
  etransfer: 'Interac e-Transfer',
  cash: 'Cash at the door',
};

/**
 * Send the appropriate email for an order's current state.
 *
 * `reserved` — the order is pending and the buyer needs to do something.
 * `paid`     — payment is confirmed; this carries the QR ticket.
 *
 * Returns false on failure rather than throwing: recording the payment is the
 * primary job and must not be undone by a mail outage.
 */
export async function sendOrderEmail(
  kind: 'reserved' | 'paid',
  order: OrderRecord,
  event: TicketedEventRecord,
): Promise<boolean> {
  const when = formatWhen(event.starts_at);
  const details =
    row('Event', escapeHtml(event.title)) +
    row('When', escapeHtml(when)) +
    (event.location ? row('Where', escapeHtml(event.location)) : '') +
    row('Tickets', String(order.quantity)) +
    row('Total', formatMoney(order.amount_cents)) +
    row('Method', escapeHtml(METHOD_LABELS[order.payment_method])) +
    row('Reference', `<strong style="letter-spacing:0.08em;">${escapeHtml(order.reference)}</strong>`);

  if (kind === 'paid') {
    const url = ticketUrl(order.checkin_token);
    const body = `
      ${callout('Your ticket', order.reference, 'navy')}
      <div style="text-align:center;margin-top:20px;">
        <img src="${ticketQrUrl(order.checkin_token)}" alt="Ticket QR code" width="220" height="220"
             style="display:block;margin:0 auto;border:1px solid #e7e2d6;border-radius:4px;" />
        <div style="font-size:13px;color:#8a7f6a;margin-top:10px;line-height:1.6;">
          Show this code at the door. A copy is attached to this email.
        </div>
        <a href="${escapeHtml(url)}"
           style="display:inline-block;margin-top:16px;background-color:#1b2a4a;color:#ffffff;text-decoration:none;
                  padding:12px 24px;border-radius:4px;font-size:15px;">View your ticket</a>
      </div>`;

    const html = brandedEmail({
      heading: 'Payment received',
      intro: `Thank you, ${order.buyer_name}. Your payment is confirmed and your ticket is below.`,
      rows: details,
      body,
      footer: [
        `Show the QR code at the door — on your phone or printed.`,
        event.refund_policy,
      ].filter(Boolean).join(' '),
    });

    const text =
      `Payment received — ${event.title}\n\n` +
      `Reference: ${order.reference}\n` +
      `When: ${when}\n` +
      (event.location ? `Where: ${event.location}\n` : '') +
      `Tickets: ${order.quantity}\n` +
      `Total: ${formatMoney(order.amount_cents)}\n\n` +
      `Your ticket: ${url}\n` +
      `Show the QR code at the door.\n`;

    // Remote images are blocked by default in many mail clients, so the PNG is
    // attached as well — it survives offline, and saves to the phone's photos.
    let attachments;
    try {
      const png = await qrPngBuffer(order.checkin_token);
      attachments = [{ filename: `goodwood-ticket-${order.reference}.png`, content: png.toString('base64') }];
    } catch (err) {
      console.error('tickets: QR generation failed, sending without attachment', err);
    }

    return sendEmail({ to: order.buyer_email, subject: `Your ticket — ${event.title}`, html, text, attachments });
  }

  // kind === 'reserved'
  const holdNote = order.hold_expires_at
    ? `Your seat${order.quantity > 1 ? 's are' : ' is'} held until ${formatWhen(order.hold_expires_at)}.`
    : '';

  const instructions =
    order.payment_method === 'etransfer'
      ? `
      ${callout('Send your e-Transfer to', event.etransfer_email || 'the address below')}
      <div style="margin-top:16px;">
        ${callout('and put this in the memo', order.reference)}
      </div>
      <div style="font-size:15px;line-height:1.65;color:#1f2a37;margin-top:16px;">
        <strong>The reference in the memo is how we match your payment to your ticket.</strong>
        Without it we may not be able to find your order.
      </div>
      ${event.etransfer_instructions
          ? `<div style="font-size:15px;line-height:1.65;color:#1f2a37;margin-top:12px;">${escapeHtml(event.etransfer_instructions)}</div>`
          : ''}`
      : `
      ${callout('Bring to the door', formatMoney(order.amount_cents))}
      <div style="font-size:15px;line-height:1.65;color:#1f2a37;margin-top:16px;">
        Please bring exact cash if you can, and quote reference
        <strong>${escapeHtml(order.reference)}</strong> at the door.
      </div>`;

  const html = brandedEmail({
    heading: order.payment_method === 'etransfer' ? 'Seat reserved — payment needed' : 'Seat reserved',
    intro: `Thank you, ${order.buyer_name}. ${holdNote}`,
    rows: details,
    body: instructions,
    footer: 'You will receive your ticket with a QR code once payment is confirmed.',
  });

  const text =
    `Seat reserved — ${event.title}\n\n` +
    `Reference: ${order.reference}\n` +
    `When: ${when}\n` +
    `Tickets: ${order.quantity}\n` +
    `Total: ${formatMoney(order.amount_cents)}\n\n` +
    (order.payment_method === 'etransfer'
      ? `Send an Interac e-Transfer of ${formatMoney(order.amount_cents)} to ${event.etransfer_email || '(see the website)'}\n` +
        `IMPORTANT: put ${order.reference} in the memo so we can match your payment.\n`
      : `Bring ${formatMoney(order.amount_cents)} in cash to the door and quote ${order.reference}.\n`) +
    (holdNote ? `\n${holdNote}\n` : '') +
    `\nYou will receive your ticket with a QR code once payment is confirmed.\n`;

  return sendEmail({
    to: order.buyer_email,
    subject: `Seat reserved — ${event.title} (${order.reference})`,
    html,
    text,
  });
}

/** Heads-up to the Treasurer/Secretary that a new order landed. */
export async function notifyLodge(order: OrderRecord, event: TicketedEventRecord): Promise<boolean> {
  const to = process.env.TICKETS_EMAIL_TO || process.env.CONTACT_EMAIL_TO;
  if (!to) return false;

  const html = brandedEmail({
    heading: 'New ticket order',
    rows:
      row('Event', escapeHtml(event.title)) +
      row('Buyer', escapeHtml(order.buyer_name)) +
      row('Email', escapeHtml(order.buyer_email)) +
      row('Tickets', String(order.quantity)) +
      row('Total', formatMoney(order.amount_cents)) +
      row('Method', escapeHtml(METHOD_LABELS[order.payment_method])) +
      row('Status', escapeHtml(order.payment_status)) +
      row('Reference', escapeHtml(order.reference)),
    footer: 'Manage this order in the portal under Event Payments.',
  });

  const text =
    `New ticket order — ${event.title}\n` +
    `${order.buyer_name} <${order.buyer_email}>\n` +
    `${order.quantity} × ${formatMoney(order.amount_cents / Math.max(1, order.quantity))} = ${formatMoney(order.amount_cents)}\n` +
    `Method: ${METHOD_LABELS[order.payment_method]} · Status: ${order.payment_status}\n` +
    `Reference: ${order.reference}\n`;

  return sendEmail({
    to,
    subject: `New ticket order — ${event.title} (${order.reference})`,
    html,
    text,
    replyTo: order.buyer_email,
  });
}
