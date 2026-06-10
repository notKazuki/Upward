-- Upward — web push + reminders. Run once. Safe to re-run.

-- 1. Per-device push subscriptions (one row per browser/device endpoint).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- 2. User timezone (persisted from the tz cookie) — reminders fire in the
--    user's local time, not the server's.
alter table public.profiles
  add column if not exists timezone text;

-- 3. Cron dedupe — the scheduler runs every ~15 minutes, so each (user, kind,
--    day) records that a reminder was sent and blocks duplicates. Written only
--    by the service-role cron endpoint; users never touch it.
create table if not exists public.cron_sends (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind    text not null,
  sent_on date not null,
  primary key (user_id, kind, sent_on)
);

alter table public.cron_sends enable row level security;
-- No user policies on purpose: service role bypasses RLS; users have no access.
