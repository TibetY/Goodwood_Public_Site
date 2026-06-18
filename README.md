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

> **Note:** `VITE_SUPABASE_SERVICE_ROLE_KEY` and `VITE_ANTHROPIC_API_KEY` are server-side secrets — they are only accessed in Netlify Functions via `process.env`, never exposed to the browser.

---

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start local dev server with Netlify CLI (functions + frontend) |
| `npm run dev:vite` | Start Vite dev server only (no serverless functions) |
| `npm run build` | Production build via `react-router build` |
| `npm run start` | Serve the production build locally |
| `npm run typecheck` | Generate route types and run TypeScript compiler |

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
