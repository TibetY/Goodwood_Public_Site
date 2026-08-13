-- 003_zeffy.sql
-- Replaces Stripe with Zeffy as the card-payment provider.
--
-- Zeffy is Canadian and charges nonprofits nothing — no platform, transaction
-- or card fees — which is worth roughly 2.9% + $0.30 on every ticket compared
-- with Stripe.
--
-- The trade-off is that Zeffy's public API is READ-ONLY. We cannot create a
-- checkout through it, so Zeffy hosts the payment form and we reconcile
-- afterwards: a buyer choosing card is sent to the lodge's Zeffy campaign, and
-- the payment comes back to us through the webhook and the hourly sync.
--
-- Because payments arrive asynchronously and may not carry our order reference,
-- they land in `zeffy_payments` first and are then matched to an order. Anything
-- that cannot be matched automatically sits in a queue for an event admin to
-- resolve by hand — the money is never lost, it just needs a human.
--
-- Idempotent. Requires 001_roles.sql and 002_ticketing.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- payment_method: stripe → zeffy
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'payment_method' and e.enumlabel = 'stripe'
  ) then
    alter type public.payment_method rename value 'stripe' to 'zeffy';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ticketed_events
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ticketed_events' and column_name = 'allow_stripe'
  ) then
    alter table public.ticketed_events rename column allow_stripe to allow_zeffy;
  end if;
end $$;

-- Card payment now defaults OFF per event: it cannot work until the lodge has a
-- Zeffy campaign to send buyers to.
alter table public.ticketed_events
  add column if not exists allow_zeffy boolean not null default false;

alter table public.ticketed_events
  -- The hosted Zeffy campaign the buyer is sent to. Card payment is only
  -- offered when this is set, since without it there is nowhere to send them.
  add column if not exists zeffy_form_url text,
  -- Zeffy campaign id, used to filter the payments API down to this event.
  add column if not exists zeffy_campaign_id text;

create index if not exists ticketed_events_zeffy_campaign_idx
  on public.ticketed_events (zeffy_campaign_id) where zeffy_campaign_id is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- event_orders: swap the Stripe columns for Zeffy's single payment id
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.event_orders
  add column if not exists zeffy_payment_id text;

create unique index if not exists event_orders_zeffy_payment_idx
  on public.event_orders (zeffy_payment_id) where zeffy_payment_id is not null;

-- Stripe columns are dropped rather than left behind: a half-migrated money
-- table is how reconciliation bugs start.
alter table public.event_orders
  drop column if exists stripe_session_id,
  drop column if exists stripe_payment_intent_id,
  drop column if exists stripe_charge_id;

-- Kept, renamed: with Zeffy the processing fee is zero, but the columns still
-- carry what the lodge actually banks — a buyer may add a voluntary Zeffy tip,
-- so the amount received and the ticket price are not always the same number.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_orders' and column_name = 'stripe_fee_cents'
  ) then
    alter table public.event_orders rename column stripe_fee_cents to fee_cents;
  end if;
end $$;

alter table public.event_orders
  add column if not exists fee_cents integer;

drop table if exists public.stripe_webhook_events;


-- ─────────────────────────────────────────────────────────────────────────────
-- zeffy_payments — every payment we have seen, matched or not.
--
-- This is both the deduplication key for webhook redelivery and the reconcile
-- queue. `raw` keeps the untouched payload so a schema change at Zeffy's end is
-- debuggable from production data rather than guesswork.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.zeffy_payments (
  id                text primary key,          -- Zeffy's payment id
  campaign_id       text,
  payer_name        text,
  payer_email       text,
  amount_cents      integer not null default 0,
  currency          text not null default 'cad',
  status            text,
  paid_at           timestamptz,
  raw               jsonb not null default '{}',
  source            text not null default 'webhook',   -- webhook | sync | manual
  -- Null until matched. Set by the matcher or by an admin in the portal.
  order_id          uuid references public.event_orders(id) on delete set null,
  matched_at        timestamptz,
  matched_by        uuid references auth.users(id) on delete set null,
  match_confidence  text,                      -- exact | email_amount | manual
  ignored           boolean not null default false,
  received_at       timestamptz not null default now()
);

create index if not exists zeffy_payments_unmatched_idx
  on public.zeffy_payments (campaign_id, received_at desc)
  where order_id is null and ignored = false;

create index if not exists zeffy_payments_email_idx
  on public.zeffy_payments (lower(payer_email));

alter table public.zeffy_payments enable row level security;
revoke all on public.zeffy_payments from anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- match_zeffy_payment
--
-- Links a Zeffy payment to an order and marks that order paid, in one
-- transaction. Reuses mark_order_paid so the `payment_status <> 'paid'` guard
-- still provides idempotency against webhook redelivery.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.match_zeffy_payment(
  p_payment_id text,
  p_order_id   uuid,
  p_confidence text,
  p_actor      uuid default null
) returns public.event_orders
language plpgsql security definer set search_path = public as $$
declare v_order public.event_orders;
begin
  update public.zeffy_payments
     set order_id         = p_order_id,
         matched_at       = now(),
         matched_by       = p_actor,
         match_confidence = p_confidence
   where id = p_payment_id;

  update public.event_orders
     set zeffy_payment_id = p_payment_id
   where id = p_order_id
     and zeffy_payment_id is distinct from p_payment_id;

  v_order := public.mark_order_paid(
    p_order_id,
    p_actor,
    p_payment_id,
    format('Matched to Zeffy payment %s (%s)', p_payment_id, p_confidence)
  );

  return v_order;
end $$;

revoke all on function public.match_zeffy_payment(text, uuid, text, uuid)
  from public, anon, authenticated;
