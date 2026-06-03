-- Upward — Goals tracker. Run once in Supabase → SQL Editor. Safe to re-run.

create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null default 'other',
  type          text not null check (type in ('binary', 'numeric', 'streak')),
  target_value  numeric check (target_value is null or target_value > 0),
  unit          text,
  start_date    date not null default current_date,
  deadline      date,
  why           text,
  status        text not null default 'active'
                  check (status in ('active', 'completed', 'paused', 'abandoned')),
  created_at    timestamptz not null default now()
);

create index if not exists goals_user_idx
  on public.goals (user_id, created_at desc);

-- Each progress check-in. Builds the history/journey and drives numeric totals
-- and streaks.
create table if not exists public.goal_logs (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  logged_on   date not null default current_date,
  value       numeric,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists goal_logs_goal_idx
  on public.goal_logs (goal_id, logged_on desc, created_at desc);

alter table public.goals enable row level security;
alter table public.goal_logs enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

drop policy if exists "goal_logs_select_own" on public.goal_logs;
create policy "goal_logs_select_own" on public.goal_logs for select using (auth.uid() = user_id);
drop policy if exists "goal_logs_insert_own" on public.goal_logs;
create policy "goal_logs_insert_own" on public.goal_logs for insert with check (auth.uid() = user_id);
drop policy if exists "goal_logs_delete_own" on public.goal_logs;
create policy "goal_logs_delete_own" on public.goal_logs for delete using (auth.uid() = user_id);
