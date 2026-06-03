-- Upward — training goal + custom exercises. Run once. Safe to re-run.

alter table public.profiles
  add column if not exists training_goal text
    check (training_goal is null or training_goal in ('strength', 'hypertrophy', 'endurance'));

create table if not exists public.custom_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day_label   text not null,
  name        text not null,
  target      text,
  sets        text,
  reps        text,
  created_at  timestamptz not null default now()
);

create index if not exists custom_exercises_user_idx
  on public.custom_exercises (user_id, day_label, created_at);

alter table public.custom_exercises enable row level security;

drop policy if exists "custom_ex_select_own" on public.custom_exercises;
create policy "custom_ex_select_own" on public.custom_exercises for select using (auth.uid() = user_id);
drop policy if exists "custom_ex_insert_own" on public.custom_exercises;
create policy "custom_ex_insert_own" on public.custom_exercises for insert with check (auth.uid() = user_id);
drop policy if exists "custom_ex_delete_own" on public.custom_exercises;
create policy "custom_ex_delete_own" on public.custom_exercises for delete using (auth.uid() = user_id);
