-- Upward — AI Sherpa free-taste daily counter. Free users get a few messages a
-- day; Pro is unlimited. One row per (user, local day). Run once. Safe to re-run.
create table if not exists public.sherpa_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  used_on date not null,
  count   int  not null default 0,
  primary key (user_id, used_on)
);

alter table public.sherpa_usage enable row level security;

drop policy if exists "sherpa_usage_select_own" on public.sherpa_usage;
create policy "sherpa_usage_select_own" on public.sherpa_usage
  for select using (auth.uid() = user_id);

drop policy if exists "sherpa_usage_insert_own" on public.sherpa_usage;
create policy "sherpa_usage_insert_own" on public.sherpa_usage
  for insert with check (auth.uid() = user_id);

drop policy if exists "sherpa_usage_update_own" on public.sherpa_usage;
create policy "sherpa_usage_update_own" on public.sherpa_usage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
