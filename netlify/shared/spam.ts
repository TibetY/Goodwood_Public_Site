// Public-form spam defences.
//
// Shared by the site's two public write paths: submit-contact.ts (contact
// form) and create-order.ts (ticket purchase).

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

// ── Content screening ──────────────────────────────────────────────────────
//
// Turnstile and the traps above stop bots; they do nothing about a human
// typing abuse into the form. This screens the text itself.
//
// The lists are deliberately conservative: words that are also common names or
// innocent words (Dick, Cockburn, con, pussy-as-in-cat, Scunthorpe) are left
// out, because a false positive silently drops a genuine enquiry.

/** Matched with any suffix: "fuck" catches fucking, fucker, fucked… */
const PROFANE_STEMS = [
  'fuck', 'motherfuck', 'shit', 'bullshit', 'horseshit', 'dipshit', 'apeshit', 'cunt', 'bitch', 'bastard', 'asshole', 'arsehole',
  'wanker', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'retard',
  // French / Québécois
  'putain', 'merde', 'connard', 'connass', 'salope', 'encul', 'tabarnak',
  'tabarnac', 'tabernak', 'calisse', 'caliss', 'crisse',
];

/** Matched as whole words only (plus a plural/verb ending). */
const PROFANE_WORDS = ['twat', 'pute', 'dickhead', 'jackass', 'prick'];

/**
 * Standalone homophobic and transphobic slurs. Words like "gay" that are
 * normal in a genuine message but can be used as an insult are deliberately
 * NOT here: judging those needs context, which is moderation.ts's job.
 */
const SLUR_PATTERNS: RegExp[] = [
  // "homo sapiens" and "homogeneous" are spared.
  /\bhomos?\b(?!\s+sapiens)/,
  /\bfags?\b/,
  /\b(?:lesbos?|trann(?:y|ies)|tapettes?|pedes?|fifs?)\b/,
];

/** Innocent words the fuzzy matching would otherwise catch (shiitake → "shiit"). */
const ALLOWED_WORDS = /\b(?:shiitake|scunthorpe|penistone)\b/g;

/** Undo the usual tricks: accents, leetspeak, case. */
function normalise(text: string): string {
  const leet: Record<string, string> = {
    '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a',
    '5': 's', '$': 's', '7': 't', '+': 't',
  };
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(ALLOWED_WORDS, ' ')
    .replace(/[01!|34@5$7+]/g, (c) => leet[c]);
}

/** "fuck" → "f+[^a-z\s]*u+[^a-z\s]*c+…" so "fuuuck" and "f*u*c*k" both match. */
const fuzzy = (word: string) =>
  word.split('').map((c) => `${c}+`).join('[^a-z\\s]{0,2}');

const PROFANITY_RE = new RegExp(
  `(?<![a-z])(?:` +
    `(?:${PROFANE_STEMS.map(fuzzy).join('|')})[a-z]*` +
    `|(?:${PROFANE_WORDS.map(fuzzy).join('|')})(?:s|es|ed|ing)?(?![a-z])` +
    `)`,
);

// "f*ck" / "sh!t" style masking where the vowel is replaced by a symbol.
const MASKED_RE = /(?<![a-z])(?:f[*#_.-]+c?k|sh[*#_.-]+t|c[*#_.-]+nt)/;

export function containsProfanity(text: string): boolean {
  const n = normalise(text);
  return (
    PROFANITY_RE.test(n) ||
    MASKED_RE.test(text.toLowerCase()) ||
    SLUR_PATTERNS.some((re) => re.test(n))
  );
}

// A whole URL token, so "https://example.org" counts once, not twice.
const URL_SOURCE = String.raw`(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|ru|xyz|top|info|biz|io|co)\b`;
const URL_TEST_RE = new RegExp(URL_SOURCE, 'i');
const URL_COUNT_RE = new RegExp(URL_SOURCE, 'gi');

/** More links than this in a message is link spam. */
export const MAX_LINKS = 2;

/**
 * Screen a contact-form submission's free text. Returns a short reason when it
 * should be dropped (for logging only — never shown to the sender), or null
 * when it is clean.
 */
export function screenContent(input: { names: string[]; message: string }): string | null {
  const allText = [...input.names, input.message].join('\n');
  if (containsProfanity(allText)) return 'profanity';
  if (input.names.some((n) => URL_TEST_RE.test(n))) return 'link-in-name';
  const links = input.message.match(URL_COUNT_RE)?.length ?? 0;
  if (links > MAX_LINKS) return 'too-many-links';
  return null;
}

/** Client IP as reported by Netlify's edge, for Turnstile's remoteip check. */
export function clientIp(headers: Record<string, string | undefined>): string | undefined {
  return headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || undefined;
}
