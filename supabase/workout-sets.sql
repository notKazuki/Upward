-- Upward — set-by-set workout logging. Run once. Safe to re-run.
-- Each logged session (a row in `workouts`) can have many sets across exercises.

create table if not exists public.workout_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  exercise    text not null,
  set_index   integer not null default 1,
  weight      numeric check (weight is null or weight >= 0),
  reps        integer check (reps is null or reps >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists workout_sets_user_ex_idx
  on public.workout_sets (user_id, exercise, created_at desc);
create index if not exists workout_sets_workout_idx
  on public.workout_sets (workout_id);

alter table public.workout_sets enable row level security;

drop policy if exists "workout_sets_select_own" on public.workout_sets;
create policy "workout_sets_select_own" on public.workout_sets for select using (auth.uid() = user_id);
drop policy if exists "workout_sets_insert_own" on public.workout_sets;
create policy "workout_sets_insert_own" on public.workout_sets for insert with check (auth.uid() = user_id);
drop policy if exists "workout_sets_delete_own" on public.workout_sets;
create policy "workout_sets_delete_own" on public.workout_sets for delete using (auth.uid() = user_id);
