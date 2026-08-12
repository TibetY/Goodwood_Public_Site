-- 002_ticketing.sql
-- Event ticketing and payment tracking.
--
-- Lodge events are authored in Google Calendar and have nowhere to store a
-- price or a capacity, so a "ticketed event" is a separate app-owned record
-- that OPTIONALLY links back to a calendar entry via gcal_event_id. The
-- ticketed event is self-sufficient: if the calendar link is absent or the
-- Secretary recreates the calendar entry (which changes its id), ticketing
-- keeps working.
--
-- Idempotent — safe to re-run. Requires sql/001_roles.sql to have run first.

create extension if not exists pgcrypto;   -- gen_random_uuid(), gen_random_bytes()

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.payment_method as enum ('stripe', 'etransfer', 'cash');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'refunded', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ticketed_events
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.ticketed_events (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,             -- /events/<slug>/tickets
  title                  text not null,
  description            text not null default '',
  location               text not null default '',
  starts_at              timestamptz not null,
  ends_at                timestamptz,

  -- Display convenience only. When it matches a LodgeEvent.id on /events, that
  -- row gets an inline "Tickets" button. Nullable, and nothing breaks if stale.
  gcal_event_id          text,

  price_cents            integer not null default 0 check (price_cents >= 0),
  currency               text    not null default 'cad' check (currency = 'cad'),
  capacity               integer check (capacity is null or capacity > 0),  -- null = unlimited
  max_per_order          integer not null default 10 check (max_per_order between 1 and 50),

  sales_open_at          timestamptz,
  sales_close_at         timestamptz,

  allow_stripe           boolean not null default false,   -- stays false until Stripe is live
  allow_etransfer        boolean not null default true,
  allow_cash             boolean not null default true,

  etransfer_email        text,
  etransfer_instructions text not null default '',
  etransfer_hold_hours   integer not null default 72 check (etransfer_hold_hours between 1 and 720),
  refund_policy          text not null default '',

  published              boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users(id) on delete set null
);

create index if not exists ticketed_events_published_idx
  on public.ticketed_events (published, starts_at desc);

create unique index if not exists ticketed_events_gcal_idx
  on public.ticketed_events (gcal_event_id) where gcal_event_id is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- event_orders
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.event_orders (
  id                     uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: an event with money against it must never be
  -- deletable. The admin UI offers "unpublish" instead.
  event_id               uuid not null references public.ticketed_events(id) on delete restrict,
  reference              text not null unique,             -- human-facing, e.g. GW-7K3M9Q

  buyer_name             text not null,
  buyer_email            text not null,
  buyer_phone            text,
  notes                  text not null default '',         -- dietary needs, guest names

  quantity               integer not null check (quantity between 1 and 50),
  unit_price_cents       integer not null check (unit_price_cents >= 0),  -- snapshot at purchase
  amount_cents           integer not null check (amount_cents >= 0),
  currency               text not null default 'cad',

  payment_method         public.payment_method not null,
  payment_status         public.payment_status not null default 'pending',
  payment_reference      text,                             -- e-transfer confirmation no., "cash to Bro. Smith"
  hold_expires_at        timestamptz,                      -- null once paid
  paid_at                timestamptz,
  marked_paid_by         uuid references auth.users(id) on delete set null,

  stripe_session_id      text unique,
  stripe_payment_intent_id text,
  stripe_charge_id       text,
  stripe_fee_cents       integer,
  net_cents              integer,
  refunded_amount_cents  integer not null default 0,

  -- Bearer credential encoded in the QR. Generated in Postgres so it never
  -- round-trips through application code before being stored.
  checkin_token          text not null unique default encode(gen_random_bytes(24), 'hex'),
  checked_in_at          timestamptz,
  checked_in_by          uuid references auth.users(id) on delete set null,
  checked_in_count       integer not null default 0,       -- party of 4 may arrive separately

  confirmation_email_sent_at timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint event_orders_amount_matches
    check (amount_cents = quantity * unit_price_cents),
  constraint event_orders_checkin_bounds
    check (checked_in_count between 0 and quantity)
);

create index if not exists event_orders_event_status_idx
  on public.event_orders (event_id, payment_status);
create index if not exists event_orders_hold_idx
  on public.event_orders (hold_expires_at) where payment_status = 'pending';
create index if not exists event_orders_email_idx
  on public.event_orders (lower(buyer_email));
create index if not exists event_orders_created_idx
  on public.event_orders (created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- Audit trail — this is what makes the system a tracker rather than a snapshot.
-- "Who marked Bro. Jones paid, and when?" is answered here.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.event_order_audit (
  id         bigserial primary key,
  order_id   uuid not null references public.event_orders(id) on delete cascade,
  kind       text not null,   -- created|paid|refunded|cancelled|expired|checked_in|email_sent|email_failed|note
  detail     text not null default '',
  actor_id   uuid references auth.users(id) on delete set null,   -- null = system/webhook
  created_at timestamptz not null default now()
);

create index if not exists event_order_audit_order_idx
  on public.event_order_audit (order_id, created_at);


-- Stripe delivers events more than once by design; this makes redelivery free.
create table if not exists public.stripe_webhook_events (
  id          text primary key,   -- Stripe's evt_... id
  type        text not null,
  order_id    uuid references public.event_orders(id) on delete set null,
  received_at timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ticketed_events_touch on public.ticketed_events;
create trigger ticketed_events_touch before update on public.ticketed_events
  for each row execute function public.touch_updated_at();

drop trigger if exists event_orders_touch on public.event_orders;
create trigger event_orders_touch before update on public.event_orders
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: deny-all, deliberately.
--
-- Purchase is public, but that does NOT require an anon insert policy. Allowing
-- anon to insert into event_orders would mean also preventing anon from setting
-- payment_status, paid_at, amount_cents and checkin_token — which RLS cannot
-- express at column granularity on insert without a trigger that rewrites them.
-- At that point the same validation exists twice, in PL/pgSQL, with no Turnstile
-- and no rate limiting. Keep the door in one place: the Netlify Functions.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.ticketed_events       enable row level security;
alter table public.event_orders          enable row level security;
alter table public.event_order_audit     enable row level security;
alter table public.stripe_webhook_events enable row level security;

-- No policies are created: anon and authenticated see zero rows and write
-- nothing. Only service_role (which exists solely inside Netlify Functions)
-- bypasses RLS.

-- Defence in depth. Supabase grants table privileges to anon/authenticated by
-- default, so strip them — a future accidental permissive policy still cannot
-- expose buyer data.
revoke all on public.ticketed_events       from anon, authenticated;
revoke all on public.event_orders          from anon, authenticated;
revoke all on public.event_order_audit     from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Seat accounting
--
-- A seat is consumed by a paid order, or by a pending order whose hold has not
-- yet lapsed. Because this reads hold_expires_at > now(), an expired hold stops
-- consuming a seat the instant it lapses — the scheduled expiry job is for tidy
-- display and buyer courtesy, not for correctness.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.seats_taken(p_event_id uuid)
returns integer language sql stable as $$
  select coalesce(sum(quantity), 0)::int
  from public.event_orders
  where event_id = p_event_id
    and ( payment_status = 'paid'
       or (payment_status = 'pending'
           and (hold_expires_at is null or hold_expires_at > now())) );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- create_ticket_order
--
-- The load-bearing function. Capacity CANNOT be enforced by counting from the
-- Netlify Function and then inserting: two simultaneous buyers both read "1 seat
-- left" and both succeed. The `for update` row lock serialises purchases for one
-- event, and the price is read from the database so a client-supplied amount can
-- never be trusted.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_ticket_order(
  p_event_id       uuid,
  p_buyer_name     text,
  p_buyer_email    text,
  p_buyer_phone    text,
  p_notes          text,
  p_quantity       integer,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_reference      text,
  p_hold_minutes   integer,
  p_actor          uuid
) returns public.event_orders
language plpgsql security definer set search_path = public as $$
declare
  v_event public.ticketed_events;
  v_taken integer;
  v_order public.event_orders;
begin
  select * into v_event from public.ticketed_events where id = p_event_id for update;

  if not found then raise exception 'EVENT_NOT_FOUND'; end if;

  -- An admin recording a door sale bypasses the on-sale window; the public path
  -- never passes a status of 'paid'.
  if p_payment_status <> 'paid' then
    if not v_event.published then raise exception 'EVENT_NOT_ON_SALE'; end if;
    if v_event.sales_open_at is not null and now() < v_event.sales_open_at then
      raise exception 'EVENT_NOT_ON_SALE';
    end if;
    if v_event.sales_close_at is not null and now() > v_event.sales_close_at then
      raise exception 'EVENT_SALES_CLOSED';
    end if;

    if p_payment_method = 'stripe'    and not v_event.allow_stripe    then raise exception 'METHOD_UNAVAILABLE'; end if;
    if p_payment_method = 'etransfer' and not v_event.allow_etransfer then raise exception 'METHOD_UNAVAILABLE'; end if;
    if p_payment_method = 'cash'      and not v_event.allow_cash      then raise exception 'METHOD_UNAVAILABLE'; end if;
  end if;

  if p_quantity < 1 or p_quantity > v_event.max_per_order then
    raise exception 'INVALID_QUANTITY';
  end if;

  if v_event.capacity is not null then
    v_taken := public.seats_taken(p_event_id);
    if v_taken + p_quantity > v_event.capacity then raise exception 'SOLD_OUT'; end if;
  end if;

  insert into public.event_orders (
    event_id, reference, buyer_name, buyer_email, buyer_phone, notes,
    quantity, unit_price_cents, amount_cents, currency,
    payment_method, payment_status, hold_expires_at, paid_at, marked_paid_by
  ) values (
    p_event_id, p_reference, p_buyer_name, lower(p_buyer_email), p_buyer_phone, coalesce(p_notes, ''),
    p_quantity, v_event.price_cents, p_quantity * v_event.price_cents, v_event.currency,
    p_payment_method, p_payment_status,
    case when p_payment_status = 'paid' then null
         else now() + make_interval(mins => p_hold_minutes) end,
    case when p_payment_status = 'paid' then now()   else null end,
    case when p_payment_status = 'paid' then p_actor else null end
  ) returning * into v_order;

  -- Same transaction as the order: an order can never exist unaudited.
  insert into public.event_order_audit (order_id, kind, detail, actor_id)
  values (v_order.id, 'created', p_payment_method::text, p_actor);

  return v_order;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- mark_order_paid
--
-- `where payment_status <> 'paid'` is the idempotency primitive the entire
-- Stripe flow rests on. Calling this ten times produces one paid_at, one audit
-- row, and one confirmation email.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.mark_order_paid(
  p_order_id  uuid,
  p_actor     uuid,
  p_reference text default '',
  p_detail    text default ''
) returns public.event_orders
language plpgsql security definer set search_path = public as $$
declare v_order public.event_orders;
begin
  update public.event_orders
     set payment_status    = 'paid',
         paid_at           = coalesce(paid_at, now()),
         marked_paid_by    = coalesce(marked_paid_by, p_actor),
         payment_reference = coalesce(nullif(p_reference, ''), payment_reference),
         hold_expires_at   = null
   where id = p_order_id
     and payment_status <> 'paid'
   returning * into v_order;

  if found then
    insert into public.event_order_audit (order_id, kind, detail, actor_id)
    values (p_order_id, 'paid', p_detail, p_actor);
  else
    -- Already paid: no-op, return current state so callers stay uniform.
    select * into v_order from public.event_orders where id = p_order_id;
  end if;

  return v_order;
end $$;


-- These are SECURITY DEFINER and must only ever be reachable through the
-- service-role client inside Netlify Functions.
revoke all on function public.create_ticket_order(
  uuid, text, text, text, text, integer,
  public.payment_method, public.payment_status, text, integer, uuid
) from public, anon, authenticated;

revoke all on function public.mark_order_paid(uuid, uuid, text, text)
  from public, anon, authenticated;

revoke all on function public.seats_taken(uuid) from public, anon, authenticated;
