-- Upward — meal tracker. Run once in Supabase → SQL Editor. Safe to re-run.

create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  eaten_on    date not null default current_date,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text not null,
  calories    integer not null default 0 check (calories >= 0),
  protein     integer not null default 0 check (protein >= 0),
  carbs       integer not null default 0 check (carbs >= 0),
  fat         integer not null default 0 check (fat >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists meals_user_date_idx
  on public.meals (user_id, eaten_on desc, created_at desc);

alter table public.meals enable row level security;

drop policy if exists "meals_select_own" on public.meals;
create policy "meals_select_own" on public.meals for select using (auth.uid() = user_id);
drop policy if exists "meals_insert_own" on public.meals;
create policy "meals_insert_own" on public.meals for insert with check (auth.uid() = user_id);
drop policy if exists "meals_update_own" on public.meals;
create policy "meals_update_own" on public.meals for update using (auth.uid() = user_id);
drop policy if exists "meals_delete_own" on public.meals;
create policy "meals_delete_own" on public.meals for delete using (auth.uid() = user_id);

-- Editable daily nutrition targets live on the profile.
alter table public.profiles
  add column if not exists nutrition_targets jsonb not null default '{}'::jsonb;
