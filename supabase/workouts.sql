-- Upward — workouts table
-- Run once in the Supabase dashboard → SQL Editor. Safe to re-run.

create table if not exists public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  performed_on  date not null default current_date,
  category      text not null check (category in ('strength', 'cardio', 'mobility', 'sport')),
  title         text not null,
  duration_min  integer check (duration_min is null or duration_min >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists workouts_user_date_idx
  on public.workouts (user_id, performed_on desc, created_at desc);

alter table public.workouts enable row level security;

drop policy if exists "workouts_select_own" on public.workouts;
create policy "workouts_select_own"
  on public.workouts for select using (auth.uid() = user_id);

drop policy if exists "workouts_insert_own" on public.workouts;
create policy "workouts_insert_own"
  on public.workouts for insert with check (auth.uid() = user_id);

drop policy if exists "workouts_update_own" on public.workouts;
create policy "workouts_update_own"
  on public.workouts for update using (auth.uid() = user_id);

drop policy if exists "workouts_delete_own" on public.workouts;
create policy "workouts_delete_own"
  on public.workouts for delete using (auth.uid() = user_id);
