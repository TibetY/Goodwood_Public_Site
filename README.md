# Goodwood Lodge No. 159 — Public Website

The external-facing website for **Goodwood Lodge No. 159**, A.F. & A.M., Grand Lodge of Canada in the Province of Ontario. Built with React Router v7, Material UI, Supabase, and deployed on Netlify.

**Live site:** [goodwoodlodge159.netlify.app](https://goodwoodlodge159.netlify.app)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
  - [Routing](#routing)
  - [Authentication](#authentication)
  - [Theming & Dark Mode](#theming--dark-mode)
  - [Internationalization (i18n)](#internationalization-i18n)
  - [Data Fetching](#data-fetching)
  - [Photo Gallery](#photo-gallery)
  - [AI Chatbot](#ai-chatbot)
- [Netlify Functions (API)](#netlify-functions-api)
- [Roles](#roles)
- [Event Ticketing & Payments](#event-ticketing--payments)
- [Deployment](#deployment)

---

## Tech Stack

| Category        | Technology                                           |
| --------------- | ---------------------------------------------------- |
| Framework       | [React Router v7](https://reactrouter.com/) + Vite   |
| UI Library      | [Material UI (MUI) v7](https://mui.com/)             |
| Language        | TypeScript                                           |
| Database & Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage) |
| Server State    | [TanStack React Query v5](https://tanstack.com/query)|
| i18n            | [i18next](https://www.i18next.com/) + react-i18next  |
| Backend         | [Netlify Functions](https://docs.netlify.com/functions/overview/) (serverless) |
| Hosting         | [Netlify](https://www.netlify.com/)                  |
| AI              | [Claude API](https://docs.anthropic.com/) (Haiku 4.5 — chatbot) |

---

## Project Structure

```
├── app/
│   ├── components/         # Shared components (Header, Footer, RoundedImage)
│   ├── context/            # React context providers
│   │   ├── auth-context.tsx    # Supabase auth state (user, session, signOut)
│   │   └── theme-context.tsx   # Light/dark mode toggle with localStorage persistence
│   ├── locales/            # Translation files
│   │   ├── en.json             # English
│   │   └── fr.json             # French
│   ├── routes/             # Page components (file-based routing)
│   │   ├── about/              # History, Officers, Committees, Past Masters
│   │   ├── portal/             # Authenticated admin pages
│   │   ├── home.tsx            # Landing page
│   │   ├── photos.tsx          # Public photo gallery
│   │   ├── events.tsx          # Google Calendar embed
│   │   ├── contact.tsx         # Contact form (emails via Resend function)
│   │   ├── login.tsx           # Supabase Auth login
│   │   ├── setPassword.tsx     # Invited member password setup
│   │   └── chatBot.tsx         # AI-powered Freemasonry chatbot
│   ├── utils/
│   │   └── supabase.ts         # Supabase client (anon key)
│   ├── i18n.ts             # i18next configuration
│   ├── theme.ts            # MUI theme (light + dark palettes, typography)
│   ├── routes.ts           # Route definitions
│   └── root.tsx            # App shell (providers, layout, error boundary)
├── netlify/
│   └── functions/          # Serverless API endpoints (17 functions)
├── public/                 # Static assets (images, favicons, manifest)
├── emails/                 # HTML email templates (invite, password reset)
├── netlify.toml            # Netlify build & function configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- **Node.js 20+**
- **npm**
- A [Supabase](https://supabase.com/) project with:
  - Auth enabled
  - Storage buckets: `officer-images`, `photos` (both set to public)
  - Database tables for officers, committees, members, past masters

### Installation

```bash
git clone https://github.com/TibetY/Goodwood_Public_Site.git
cd Goodwood_Public_Site
npm install
```

### Development

```bash
# Full local dev with Netlify Functions
npm run dev

# Vite-only (no serverless functions)
npm run dev:vite
```

The dev server starts at `http://localhost:8888` (Netlify CLI) or `http://localhost:5173` (Vite-only).

---

## Environment Variables

Set these in a `.env` file locally or in the Netlify dashboard for production:

| Variable | Description | Used In |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | Frontend + Netlify Functions |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous key | Frontend client |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | Netlify Functions only |
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key for chatbot | `chat-function.ts` |
| `VITE_GOOGLE_CAL` | Google Calendar embed URL | Events page |
| `VITE_GOOGLE_CAL_API_KEY` | Google Cloud API key with Calendar API enabled (secret) | `list-events.ts` |
| `VITE_GOOGLE_CAL_ID` | Google Calendar ID (e.g. `xxxx@group.calendar.google.com`) | `list-events.ts` |
| `RESEND_API_KEY` | Resend API key for contact-form emails (secret) | `submit-contact.ts` |
| `CONTACT_EMAIL_TO` | Address that receives contact-form submissions | `submit-contact.ts` |
| `CONTACT_EMAIL_FROM` | Optional verified Resend sender (defaults to `onboarding@resend.dev`) | `submit-contact.ts` |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key (anti-spam) | Contact form + ticket purchase (client) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (secret) | `submit-contact.ts`, `create-order.ts` |
| `ZEFFY_API_KEY` | Zeffy API key (secret). Without it payments are recorded but never matched automatically. | `zeffy-webhook.ts`, `sync-zeffy-payments.ts` |
| `ZEFFY_WEBHOOK_SECRET` | Shared secret you append to the webhook URL as `?key=…` | `zeffy-webhook.ts` |
| `TICKETS_ETRANSFER_EMAIL` | Default e-Transfer address offered to ticket buyers | `admin-upsert-ticketed-event.ts` |
| `TICKETS_EMAIL_FROM` | Optional verified Resend sender for ticket emails (falls back to `CONTACT_EMAIL_FROM`) | Ticketing functions |
| `TICKETS_EMAIL_TO` | Optional address notified of new orders (falls back to `CONTACT_EMAIL_TO`) | `create-order.ts` |
| `PUBLIC_SITE_URL` | Optional site origin for ticket links and QR codes (defaults to Netlify's `URL`) | Ticketing functions |

> **Note:** `VITE_SUPABASE_SERVICE_ROLE_KEY` and `VITE_ANTHROPIC_API_KEY` are server-side secrets — they are only accessed in Netlify Functions via `process.env`, never exposed to the browser.

> **Do not add `ZEFFY_API_KEY` to `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml`.** That list is only for `VITE_`-prefixed values that Vite deliberately inlines into the client bundle. Every ticketing secret is server-only and never reaches build output.

### Spam protection

The contact form is protected by [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/),
verified server-side in `submit-contact.ts` **before** any email is sent, so bot
submissions never consume the Resend quota. A hidden honeypot field and a
submission-timing trap provide additional, zero-friction defense. Protection
activates once both `VITE_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set;
until then the function logs a warning and skips verification (the form still
works for local development).

---

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start local dev server with Netlify CLI (functions + frontend) |
| `npm run dev:vite` | Start Vite dev server only (no serverless functions) |
| `npm run build` | Production build via `react-router build` |
| `npm run start` | Serve the production build locally |
| `npm run typecheck` | Generate route types and run TypeScript compiler |
| `npm test` | Run the Vitest suite once (CI mode) |
| `npm run test:watch` | Run Vitest in interactive watch mode |

---

## Testing

The project uses [Vitest](https://vitest.dev/) with React Testing Library and
[vitest-axe](https://github.com/chaance/vitest-axe) for accessibility checks.
Tests run in a `jsdom` environment and cover three areas:

- **Functional** — user flows such as contact-form validation/submission and
  mobile-drawer navigation.
- **Accessibility** — every rendered page/component is asserted to have no
  `axe` violations via `expect(...).toHaveNoViolations()`.
- **Responsive behaviour** — `test/utils.tsx` exposes `setViewportWidth()` to
  drive `useMediaQuery`-based rendering; mobile navigation is covered through
  the drawer.

Test files live next to the code as `*.test.ts(x)`. Shared helpers are in
`test/`: `setup.ts` (matchers + jsdom polyfills) and `utils.tsx`
(`renderWithProviders`, which wraps a component in the same i18n / theme /
react-query / router providers used in `app/root.tsx`).

```bash
npm test          # run once
npm run test:watch
```

Tests also run automatically on every push and pull request via
`.github/workflows/test.yml`, acting as a regression guard so new features
can't silently break existing behaviour.

> Note: `npm run typecheck` currently reports a few pre-existing errors in the
> portal/photos routes that are unrelated to the test setup.

---

## Architecture

### Routing

Routes are defined in `app/routes.ts` using React Router v7's file-based routing:

**Public pages:**

| Path | Page | Description |
| --- | --- | --- |
| `/` | Home | Hero section, welcome, values, call-to-action |
| `/history` | History | Lodge history from 1798 to present |
| `/officers` | Officers | Current lodge officer listing with photos |
| `/committees` | Committees | Committee listings and chairmen |
| `/past-masters` | Past Masters | Historical past masters listing |
| `/photos` | Photo Gallery | Masonry-layout gallery with year/event grouping |
| `/events` | Events | Embedded Google Calendar |
| `/contact` | Contact | Contact form (emails via Resend function) |
| `/login` | Login | Supabase email/password authentication |
| `/set-password` | Set Password | Invitation-based account setup |

**Authenticated portal pages** (require login):

| Path | Page | Description |
| --- | --- | --- |
| `/portal` | Dashboard | Card-based navigation to management pages |
| `/portal/members` | Manage Members | Invite, view, delete members; send password resets |
| `/portal/committees` | Manage Committees | CRUD committees and assign members |
| `/portal/officers` | Manage Officers | Edit officer names and upload profile images |
| `/portal/photos` | Manage Photos | Upload, organize, and delete gallery photos |

### Authentication

Authentication uses **Supabase Auth** with email/password:

1. **Admin invites a member** via `/portal/members` — triggers the `invite-member` function which sends a magic link email
2. **New member** clicks the email link, lands on `/set-password`, and sets their display name and password
3. **Returning members** log in at `/login` — Supabase returns a JWT session
4. **Session state** is managed by `AuthProvider` (`app/context/auth-context.tsx`), which exposes `user`, `session`, `loading`, and `signOut` via the `useAuth()` hook
5. **Netlify Functions** verify the JWT by passing the `Authorization: Bearer <token>` header to `supabaseAdmin.auth.getUser(token)`

### Theming & Dark Mode

The app supports **light and dark mode** with a toggle in the header:

- **Theme definition:** `app/theme.ts` — Masonic-inspired color palette with WCAG AA compliant contrast ratios for both modes
- **Theme context:** `app/context/theme-context.tsx` — persists user preference to `localStorage`, falls back to system preference (`prefers-color-scheme`)
- **Logo swap:** The lodge logo switches between `goodwood-logo.svg` (light) and `goodwood-logo-dark.png` (dark) in the header, home page hero, and login page
- **Access:** Any component can use `useThemeMode()` to read the current `mode` and call `toggleTheme()`
- **Typography:** Headings use *Playfair Display* serif font; body text uses the system font stack

### Internationalization (i18n)

The site supports **English** and **French** with full translations:

- **Config:** `app/i18n.ts` — uses `i18next-browser-languagedetector` (checks `localStorage` first, then browser language)
- **Translations:** `app/locales/en.json` and `app/locales/fr.json`
- **Language switcher:** Globe icon in the header navbar
- **Usage:** Components use the `useTranslation()` hook — `t('key.path')`

### Data Fetching

- **Server state** is managed by **TanStack React Query v5**, configured in `app/root.tsx` with a 5-minute stale time, 10-minute garbage collection, and single retry on failure
- **React Router loaders** handle server-side data fetching for the public photos page
- **Netlify Functions** serve as the REST API — all admin operations go through authenticated serverless endpoints
- **Supabase client** (`app/utils/supabase.ts`) is used on the frontend for auth operations

### Photo Gallery

The photo gallery at `/photos` serves images from **Supabase Storage**:

- **Storage bucket:** `photos` (public)
- **Folder structure:** `year/event/image.jpg` (e.g. `2024_2025/Installation/photo.jpg`)
- **Loader:** Recursively lists all images via the Supabase SDK server-side, cached for 5 minutes
- **Serving:** Images load directly from Supabase's CDN via public URLs — no proxy or serverless function in the path
- **UI:** Masonry-layout grid grouped by year then event, with newest/oldest sort toggle, lazy loading, and a full-resolution modal viewer
- **Admin:** The portal at `/portal/photos` provides a file-browser interface to upload photos (multi-file, up to 10MB each), create folders, and delete images

### AI Chatbot

A floating chatbot widget (bottom-right corner) powered by **Claude Haiku 4.5**:

- **Frontend:** `app/routes/chatBot.tsx` — slide-out drawer chat UI with client-side rate limiting:
  - 10 messages per session
  - 20 messages per hour
  - 3-second cooldown between messages
  - 500-character message limit
- **Backend:** `netlify/functions/chat-function.ts` — proxies messages to the Anthropic Messages API with a system prompt scoped to Freemasonry and Goodwood Lodge
- **Safety:** The system prompt instructs the model to never reveal secret rituals, not discuss politics/religion, not fabricate information, and keep responses concise

---

## Netlify Functions (API)

All functions live in `netlify/functions/` and follow a common pattern: create a Supabase admin client with the service role key, verify the caller's JWT, perform the operation, and return JSON.

| Function | Method | Auth | Description |
| --- | --- | --- | --- |
| `list-officers` | GET | Yes | Fetch all officers ordered by position |
| `upsert-officer` | POST | Yes | Create or update an officer |
| `delete-officer` | POST | Yes | Delete an officer |
| `upload-officer-image` | POST | Yes | Upload officer profile image to Supabase Storage |
| `list-members` | GET | Yes | Fetch members with pagination |
| `invite-member` | POST | Yes | Send email invitation to a new member |
| `delete-member` | POST | Yes | Delete a member account |
| `reset-password` | POST | Yes | Send password reset email |
| `list-committees` | GET | Yes | Fetch all committees with members |
| `upsert-committee` | POST | Yes | Create or update a committee |
| `delete-committee` | POST | Yes | Delete a committee |
| `upsert-committee-member` | POST | Yes | Add or update a committee member |
| `delete-committee-member` | POST | Yes | Remove a member from a committee |
| `upload-photo` | POST | Yes | Upload a photo to the gallery storage bucket |
| `delete-photo` | POST | Yes | Delete photo(s) from the gallery storage bucket |
| `chat-function` | POST | No | AI chatbot — proxies to Claude API |
| `keep-alive` | GET | No | Health check / keep-alive ping |
| `set-member-roles` | POST | `site_admin` | Grant or revoke roles on a member |
| `list-ticketed-events` | GET | No | Published ticketed events + seats remaining (no buyer data) |
| `get-ticketed-event` | GET | No | One ticketed event by slug |
| `create-order` | POST | No | Buy tickets. Turnstile + honeypot + timing trap |
| `get-order` | GET | Token | Order status by check-in token, for the buyer |
| `ticket-qr` | GET | Token | PNG QR code for a ticket |
| `zeffy-webhook` | POST | URL secret + API re-read | Notification that a Zeffy payment completed |
| `sync-zeffy-payments` | Scheduled | — | Hourly: pulls recent Zeffy payments and reconciles them |
| `admin-zeffy-payments` | GET/POST | `event_admin` | Reconcile queue: list, match, ignore, refresh |
| `admin-list-ticketed-events` | GET | `event_admin` | All events with sales totals |
| `admin-upsert-ticketed-event` | POST | `event_admin` | Create or update a ticketed event |
| `admin-delete-ticketed-event` | DELETE | `event_admin` | Delete an event (refused once it has orders) |
| `admin-list-orders` | GET | `event_admin` | Orders for one event, with totals by method |
| `admin-create-order` | POST | `event_admin` | Record a payment taken offline (cash, cheque, stray e-transfer) |
| `admin-update-order` | POST | `event_admin` | Mark paid, cancel, refund, resend email |
| `admin-check-in` | POST | `event_admin` | Admit a guest at the door (idempotent) |
| `admin-export-orders` | GET | `event_admin` | CSV export for the Treasurer |
| `expire-holds` | Scheduled | — | Hourly: releases lapsed seat holds |

---

## Roles

`profiles.roles` is a `text[]` holding any of two **independent** roles — neither
implies the other:

| Role | Grants |
| --- | --- |
| `site_admin` | Website management, and the only role that can grant or revoke roles |
| `event_admin` | Ticketed events and payment data (buyer names, emails, amounts) |

Roles are assigned from **Portal → Manage Members → Manage Roles**. Bootstrap the
first `site_admin` with the SQL at the bottom of `sql/001_roles.sql`.

Client-side checks (`hasRole()` from `auth-context`) only hide controls the user
cannot use. Authorization is enforced server-side in every function via
`netlify/shared/auth.ts` — the UI gate is not a security boundary.

> The **pre-existing** portal functions (officers, committees, photos, members)
> still authorize on "is any authenticated user", which is how they have always
> worked. Only the ticketing endpoints are role-gated. Tightening the rest is a
> known follow-up, deliberately kept out of this change.

---

## Event Ticketing & Payments

Lodge events come from Google Calendar and have nowhere to store a price, so a
*ticketed event* is a separate record in Supabase that may optionally link back
to a calendar entry via `gcal_event_id` (which adds a **Tickets** button to that
row on `/events`). Ticketed events also appear in their own band on `/events`,
so the calendar link is a convenience, not a dependency.

**Money can arrive three ways, and all three land in the same ledger:**

| Method | Flow |
| --- | --- |
| Interac e-Transfer | Seat is held (72h by default); buyer is emailed the address and told to put their reference in the memo. An event admin confirms receipt in the portal, which emails the ticket. |
| Cash at the door | Seat is held until the event. Settled at the door, or recorded directly with **Record Payment**. |
| Credit/debit card | Handled by [Zeffy](https://www.zeffy.com/) — Canadian, and free for nonprofits. The buyer is sent to the lodge's hosted Zeffy form; the payment is reconciled back to their order automatically. |

E-Transfer reconciliation is irreducibly manual: Interac has no API at this
scale. The order reference in the memo is the whole matching mechanism, so it is
generated from an alphabet with no ambiguous characters (no `O`/`0`, `I`/`1`/`L`,
`U`) and shown in bold everywhere. The tracker also searches on name, email and
phone for transfers that arrive without a memo.

### Why Zeffy, and what that costs us

Zeffy charges nonprofits nothing — no platform, transaction or card fees — where
a conventional processor takes roughly 2.9% + $0.30 per ticket. It funds itself
by asking buyers for a voluntary contribution at checkout. Eligibility is broad:
a registered charity, an incorporated nonprofit, or an unincorporated association
operating on a non-commercial basis, provided it has a bank account in the
organisation's name.

The trade-off is that **Zeffy's public API is read-only**. We cannot create a
checkout session, so Zeffy hosts the payment form and we reconcile afterwards.
Two consequences shape the design:

- **Payments do not carry our order reference.** Attribution is by payer email
  plus amount. Most match automatically; the rest land in a reconcile queue in
  the portal for a one-click manual match. Nothing is ever dropped — an
  unattributed payment stays visible until someone resolves it.
- **The webhook is unsigned.** Zeffy documents no signing secret, so the webhook
  body is untrusted input. `zeffy-webhook.ts` trusts it for exactly one thing —
  the payment id — then re-reads that payment from the authenticated API before
  acting on it. A forged request names a payment that does not exist and does
  nothing. `ZEFFY_WEBHOOK_SECRET` in the URL is a cheap first gate, not the
  actual control.

Because attribution is heuristic, `sync-zeffy-payments` also polls the API hourly.
That is what guarantees the lodge eventually sees every payment even if the
webhook was never configured or silently stopped delivering.

### Setup

1. Run `sql/001_roles.sql`, `sql/002_ticketing.sql` and `sql/003_zeffy.sql` in
   the Supabase SQL Editor — see `sql/README.md`.
2. Grant yourself `site_admin`, then grant `event_admin` to the Secretary or
   Treasurer.
3. Create an event under **Portal → Event Payments**, set the price, capacity and
   e-Transfer address, and publish it.

The lodge can sell tickets and track every payment at this point, with no Zeffy
account at all. To add card payments:

1. Register the lodge at [zeffy.com](https://www.zeffy.com/) and create a
   **ticketing campaign** for the event.
2. In Zeffy, go to **Settings → Integrations**, copy the API key into
   `ZEFFY_API_KEY`, and point a webhook at
   `https://<site>/.netlify/functions/zeffy-webhook?key=<ZEFFY_WEBHOOK_SECRET>`
   subscribed to `payment.completed`.
3. Edit the event in the portal, tick **Card (Zeffy)**, and paste in the campaign
   link and campaign ID.

Ask buyers to use the same email address on the Zeffy form as on ours — that is
what lets the payment match itself. The purchase form prefills it, so this only
matters when someone deliberately changes it.

Refunds are issued in the Zeffy dashboard, where the money actually is, then
recorded in the tracker with the **Refund** action.

### Check-in

Each paid order gets a QR encoding `/t/<token>` — an opaque random token, not the
order id, so it carries no personal data and can be reissued. Any phone's camera
opens it, so the doorkeeper needs no app.

**Portal → Event Payments → Door check-in** loads the attendee list once and
caches it in `localStorage`, so search and check-in keep working when the signal
drops; check-ins taken offline are queued and sync automatically. There is a
print button for when the phone dies.

### Card data

Zeffy hosts the payment form and we only ever link to it, so no card details ever
touch this site — which keeps the lodge at PCI SAQ A, the lightest tier. **Never
add a card input field to this site.**

### Not handled

- **Tax.** No GST/HST is calculated; prices are tax-inclusive. If the lodge is
  registered, confirm the treatment before the first sale — retrofitting tax onto
  issued receipts is unpleasant.
- **Zeffy tips.** A buyer may add a voluntary contribution to Zeffy on top of the
  ticket price. The tracker matches on "paid at least the ticket price" and
  records the ticket price as the order amount, so the tip is Zeffy's, not
  lodge revenue.
- **Waitlists.** Sold-out events direct buyers to the Secretary.

---

## Deployment

The site deploys automatically to **Netlify** on push to `main`.

### Netlify Configuration

Defined in `netlify.toml`:

- **Build command:** `npm run build`
- **Publish directory:** `build/client`
- **Node version:** 20
- **Functions directory:** `netlify/functions`

### Build Output

```
build/
├── client/    # Static assets served by Netlify CDN
└── server/    # SSR bundle for React Router loaders
```

### Setting Up a New Deployment

1. Connect the GitHub repo to a Netlify site
2. Set all [environment variables](#environment-variables) in Netlify → Site settings → Environment variables
3. In Supabase, create Storage buckets `officer-images` and `photos`, both set to **public**
4. Ensure the Supabase database has the required tables (officers, committees, members, past_masters)
5. Push to `main` — Netlify builds and deploys automatically

---

## License

Private repository. All rights reserved, Goodwood Lodge No. 159.
