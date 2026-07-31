# Roots stock watcher

Watches a roots.com product page for specific sizes and sends a text with a buy
link the moment one comes back in stock.

Default target: **Roots x Big Apple T-Shirt**, colour `12B`, **sizes 3 and 5**.

```
https://www.roots.com/ca/en/roots-x-big-apple-t-shirt-27190104.html?dwvar_27190104_color=12B
```

## Quick start

```bash
# One check, no texts sent — just prints what it sees.
node scripts/roots-stock-watch/index.mjs --once --dry-run

# Keep checking every 30 minutes in this terminal.
node scripts/roots-stock-watch/index.mjs --watch --interval 30
```

`npm run watch:roots -- --once` does the same thing.

## Setting up the text message

SMS goes out through Twilio. From the [Twilio console](https://console.twilio.com)
you need an account SID, an auth token, and a phone number to send from (a
Canadian local number is a few dollars a month; a trial account works too, but
only sends to numbers you've verified).

```bash
export TWILIO_ACCOUNT_SID=ACxxxxxxxx
export TWILIO_AUTH_TOKEN=xxxxxxxx
export TWILIO_FROM=+1416XXXXXXX      # your Twilio number
export ALERT_TO_PHONE=+1XXXXXXXXXX   # your phone; comma-separate for several
```

No Twilio account? Set `ROOTS_WATCH_WEBHOOK` to any URL that accepts a JSON POST
— Pushover, ntfy, Slack, Discord, or an IFTTT/Zapier hook wired to SMS — and the
alert goes there instead. The body includes `message`, `text` and `content` so
most services work without a translation step.

With neither set, the watcher still runs and prints results; it just has nowhere
to send them, and says so on startup.

## Running it every 30 minutes

`.github/workflows/roots-stock-watch.yml` runs the check on GitHub Actions at
:07 and :37 past every hour, so nothing needs to stay open on your machine. Add
the Twilio values as **repository secrets** (Settings → Secrets and variables →
Actions) — never commit a phone number or auth token.

To run it locally instead, `--watch` keeps a terminal loop going, or use cron:

```cron
7,37 * * * * cd /path/to/repo && /usr/bin/node scripts/roots-stock-watch/index.mjs --once >> /tmp/roots-watch.log 2>&1
```

## How it decides something is in stock

roots.com runs on Salesforce Commerce Cloud, which exposes the same JSON
endpoint the product page itself calls when you click a size swatch
(`Product-Variation`). Each size comes back with a `selectable` flag — the
site's own answer to "can this go in the cart right now" — and that is what the
watcher trusts. The endpoint URL is read out of the page rather than hard-coded,
so a storefront or locale change doesn't break it.

If that call fails, it falls back to reading the size swatches out of the HTML,
and flags the result as low confidence; alerts from that path carry a
"double-check before buying" note.

Every layer is allowed to answer **unknown**. A size that can't be read is never
reported as sold out, because a quiet watcher and a sold-out shirt look
identical from the outside — after four unreadable checks in a row (about two
hours) it sends *itself* an alert so a site redesign or a bot wall doesn't cost
you the restock.

## Options

| Flag | Meaning |
| --- | --- |
| `--url <url>` | Product page, including the `dwvar_..._color` parameter. |
| `--sizes 3,5` | Sizes to watch. `3` also matches `3T` / `3 (3T)`. |
| `--watch` | Keep running instead of checking once. |
| `--interval 30` | Minutes between checks in `--watch` mode. |
| `--renotify-hours 6` | While a size stays in stock, re-text at most this often. |
| `--browser` | Render with Playwright (`npm i -D playwright`) if plain fetches get blocked. |
| `--dump page.html` | Save the fetched HTML — useful when parsing looks wrong. |
| `--json` | Machine-readable output. |
| `--dry-run` | Do everything except send. |

Exit codes: `0` nothing in stock, `10` something is, `20` couldn't tell.

## State

`.watch-state.json` (gitignored, next to the script) remembers what each size
looked like last time, so a restock produces one text rather than one every half
hour. Delete it to start fresh. On GitHub Actions it's carried between runs by
the Actions cache.

## If it stops working

Run `--once --dump /tmp/page.html --json` and look at `source` in the output:

- `variation-api` — the good path.
- `html` — the endpoint call failed; parsing is working off markup.
- `none` — the page couldn't be fetched at all. Check `/tmp/page.html` for a
  bot-check or CAPTCHA page; `--browser` usually gets past those.

The parsers are unit-tested against fixtures in `test/roots-stock-watch.test.ts`,
so `npm test` will tell you whether a change broke the logic — but only the real
page can tell you whether the site changed shape underneath it.
