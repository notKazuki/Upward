-- Upward — earned achievements (badges). Run once. Safe to re-run.
-- Achievements are computed from activity; this table records WHICH a user has
-- earned and WHEN, so badges have an unlock date and can be shown on profiles.
-- Cross-user reads (badges on a profile) go through the service-role client.

create table if not exists public.achievements (
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  earned_on      date not null default current_date,
  created_at     timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists achievements_user_idx on public.achievements (user_id);

alter table public.achievements enable row level security;

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements
  for select using (auth.uid() = user_id);

drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_insert_own" on public.achievements
  for insert with check (auth.uid() = user_id);
