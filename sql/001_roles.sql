-- 001_roles.sql
-- Adds a role model to profiles.
--
-- Until now every portal page and every Netlify Function authorised on "is any
-- authenticated user", so any member who could log in could reach every admin
-- endpoint. Event ticketing stores buyer names, emails, phone numbers and
-- amounts, which must not inherit that.
--
-- Two independent roles. Neither implies the other:
--   site_admin   — manages the website (members, officers, committees, photos)
--                  and is the only role that can grant or revoke roles.
--   event_admin  — manages ticketed events and sees payment data.
--
-- Run this once against the Supabase project (SQL Editor), then grant yourself
-- site_admin with the bootstrap statement at the bottom.

alter table public.profiles
  add column if not exists roles text[] not null default '{}';

-- Roles are always queried as "does this array contain X", which is what GIN
-- indexes the `@>` operator for.
create index if not exists profiles_roles_idx
  on public.profiles using gin (roles);

-- Guard against typos silently granting nothing: only known roles may be stored.
alter table public.profiles
  drop constraint if exists profiles_roles_valid;
alter table public.profiles
  add constraint profiles_roles_valid
  check (roles <@ array['site_admin', 'event_admin']::text[]);

-- The browser needs to read its OWN roles so the portal can hide what the user
-- cannot use. Writes stay server-side (service role) — a user must never be
-- able to grant themselves a role.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Belt and braces. Even if a permissive UPDATE policy on profiles exists now or
-- is added later (the set-password flow is the likely source), a member must not
-- be able to grant themselves a role. Column-level privileges are checked before
-- RLS policies, so this holds regardless of what the policies say.
revoke update (roles) on public.profiles from anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Bootstrap: grant the first site_admin. Replace the email, then run.
-- Without this nobody can grant roles through the portal.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- update public.profiles
--    set roles = array['site_admin', 'event_admin']::text[]
--  where id = (select id from auth.users where email = 'you@example.com');
