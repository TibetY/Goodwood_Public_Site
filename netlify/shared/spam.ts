// Public-form spam defences.
//
// Lifted from netlify/functions/submit-contact.ts, which has these three layers
// running in production on the contact form. create-order.ts is the only other
// public write path on the site, so it gets the same treatment.
//
// submit-contact.ts is deliberately NOT refactored onto this module in the same
// change — extract by copy, prove it here, converge later.

/** Submissions faster than this are automated. Lenient enough that a real
 *  person reading and filling the form is never caught. */
export const MIN_FILL_MS = 1500;

/**
 * Verify a Cloudflare Turnstile token server-side. Returns true when the token
 * is valid, or when no secret is configured (so the form keeps working before
 * the key is set — a warning is logged in that case).
 */
export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('spam: TURNSTILE_SECRET_KEY is not set — skipping verification');
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set('remoteip', remoteip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch (err) {
    console.error('spam: Turnstile verification request failed', err);
    return false;
  }
}

/**
 * True when the submission looks automated from the honeypot or the timing
 * trap. Callers should respond 200 OK without doing any work, so the bot gets
 * no signal that it was detected.
 */
export function looksAutomated(input: { botField?: string; elapsedMs?: number }): boolean {
  if (input.botField) return true;
  if (typeof input.elapsedMs === 'number' && input.elapsedMs < MIN_FILL_MS) return true;
  return false;
}

/** Client IP as reported by Netlify's edge, for Turnstile's remoteip check. */
export function clientIp(headers: Record<string, string | undefined>): string | undefined {
  return headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || undefined;
}
