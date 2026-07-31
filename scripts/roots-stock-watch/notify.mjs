// Alert delivery for the Roots stock watcher.
//
// Two channels, both credential-driven and both optional:
//
//   Twilio  — the actual SMS. Needs an account SID, auth token, a sending
//             number (or messaging service), and the destination number.
//   Webhook — a generic JSON POST, for anything that isn't Twilio: Pushover,
//             ntfy, Slack, Discord, an IFTTT/Zapier hook that fans out to SMS.
//
// Nothing here throws. A notification failure must never kill the watch loop —
// if Twilio is down at 9am we still want the 9:30 check to run, and we want the
// failure visible in the run log rather than as a crashed process.

const TWILIO_API = 'https://api.twilio.com/2010-04-01';

/**
 * Read notification config out of the environment.
 *
 * @param {NodeJS.ProcessEnv} env
 */
export function readNotifyConfig(env = process.env) {
  const toNumbers = (env.ALERT_TO_PHONE ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID ?? '',
      authToken: env.TWILIO_AUTH_TOKEN ?? '',
      from: env.TWILIO_FROM ?? '',
      messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID ?? '',
      to: toNumbers,
    },
    webhookUrl: env.ROOTS_WATCH_WEBHOOK ?? '',
  };
}

/**
 * True when at least one channel is fully configured. Used to warn loudly at
 * startup rather than silently watching a page with nowhere to send the news.
 */
export function hasAnyChannel(config) {
  const t = config.twilio;
  const twilioReady = Boolean(
    t.accountSid && t.authToken && (t.from || t.messagingServiceSid) && t.to.length,
  );
  return twilioReady || Boolean(config.webhookUrl);
}

/**
 * Send one SMS through Twilio's REST API.
 *
 * Deliberately uses fetch + Basic auth instead of the twilio SDK: this script
 * has to run from a bare `node scripts/...` with no install step, and the
 * whole request is four form fields.
 */
export async function sendTwilioSms({ accountSid, authToken, from, messagingServiceSid, to, body }) {
  const params = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) params.set('MessagingServiceSid', messagingServiceSid);
  else params.set('From', from);

  const response = await fetch(`${TWILIO_API}/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // Twilio puts the useful part (bad number, unverified trial recipient,
    // insufficient funds) in the response body, so surface it.
    throw new Error(`Twilio responded ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json().catch(() => ({}));
  return payload.sid ?? null;
}

/** POST the alert as JSON to a generic webhook. */
export async function sendWebhook(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `text` and `message` and `content` are all included so the same hook
    // works with Slack, Discord and ntfy without a translation layer.
    body: JSON.stringify({ ...payload, text: payload.message, content: payload.message }),
  });

  if (!response.ok) {
    throw new Error(`Webhook responded ${response.status}`);
  }
}

/**
 * Fan the alert out to every configured channel.
 *
 * @returns {Promise<Array<{channel: string, target?: string, ok: boolean, detail?: string}>>}
 */
export async function notifyAll(config, message, payload = {}) {
  const results = [];
  const t = config.twilio;

  if (t.accountSid && t.authToken && (t.from || t.messagingServiceSid)) {
    for (const to of t.to) {
      try {
        const sid = await sendTwilioSms({ ...t, to, body: message });
        results.push({ channel: 'twilio', target: to, ok: true, detail: sid ?? undefined });
      } catch (error) {
        results.push({ channel: 'twilio', target: to, ok: false, detail: String(error.message ?? error) });
      }
    }
  }

  if (config.webhookUrl) {
    try {
      await sendWebhook(config.webhookUrl, { ...payload, message });
      results.push({ channel: 'webhook', ok: true });
    } catch (error) {
      results.push({ channel: 'webhook', ok: false, detail: String(error.message ?? error) });
    }
  }

  return results;
}
