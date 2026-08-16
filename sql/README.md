# SQL

This project has no migrations tooling — the Supabase schema is the source of
truth and these files are the checked-in record of the changes made to it.

Run them **in order**, by hand, in the Supabase SQL Editor. Every file is
idempotent (`if not exists` / `create or replace`), so re-running one is safe.

| File | What it does |
|---|---|
| `001_roles.sql` | Adds `profiles.roles` and the `site_admin` / `event_admin` role model. |
| `002_ticketing.sql` | Ticketed events, orders, audit trail, seat accounting, and the order-creation RPC. |
| `003_zeffy.sql` | Swaps the card provider from Stripe to Zeffy; adds the imported-payments table and the matcher. |
| `backfill-profiles.sql` (repo root) | Pre-existing one-off backfill of `profiles` from `auth.users`. |

`002` creates Stripe-shaped columns that `003` immediately renames or drops. That
is deliberate: these files are the migration history, not a schema snapshot. On a
fresh project just run them in order and the end state is correct.

## First-time setup

1. Run `001_roles.sql`.
2. Grant yourself the first `site_admin` using the commented statement at the
   bottom of that file — until someone holds it, nobody can grant roles through
   the portal.
3. Run `002_ticketing.sql`.
4. Grant `event_admin` to the Secretary/Treasurer from **Portal → Manage
   Members → Manage Roles**.

## Verifying the parts Vitest cannot reach

The capacity logic lives in Postgres precisely so it is transactional, which
also means it is not exercised by the JS test suite. Check it by hand once:

```sql
-- Create a 2-seat test event, then try to take 3 seats.
select * from public.create_ticket_order(
  '<event-id>', 'Test Buyer', 'test@example.com', null, '',
  3, 'etransfer', 'pending', 'GW-TEST01', 4320, null
);
-- expected: ERROR: SOLD_OUT

-- Idempotency: run twice, expect one audit row and an unchanged paid_at.
select * from public.mark_order_paid('<order-id>', null, 'ref-1', 'manual test');
select * from public.mark_order_paid('<order-id>', null, 'ref-2', 'manual test');
select kind, detail, created_at from public.event_order_audit where order_id = '<order-id>';
```

## When a Zeffy payment shows no buyer name

Zeffy's API is in beta and its exact field names are not something we control,
so `netlify/shared/zeffy.ts` reads tolerantly and keeps the untouched payload in
`zeffy_payments.raw`. That column exists for exactly this moment — a blank name
is diagnosable rather than a guess:

```sql
select id, payer_name, payer_email, amount_cents, jsonb_pretty(raw)
  from public.zeffy_payments
 order by received_at desc
 limit 3;
```

Whatever key holds the name in `raw`, add it to `pickPersonName()` (or
`pickPersonEmail()`) in `netlify/shared/zeffy.ts`. Existing rows do **not** need
re-importing: the hourly sync and the portal's **Check Zeffy now** button both
replay normalisation over stored payloads, so the fix reaches payments received
before it shipped. Matching is retried at the same time, since a payment whose
email we could not read could never have been matched to an order.
