-- Upward — calendar plans. Run once in Supabase → SQL Editor. Safe to re-run.

create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  "time"      time,
  type        text not null default 'other'
              check (type in ('workout', 'meal', 'gaming', 'goal', 'other')),
  title       text not null,
  notes       text,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists calendar_events_user_date_idx
  on public.calendar_events (user_id, date);

alter table public.calendar_events enable row level security;

drop policy if exists "cal_select_own" on public.calendar_events;
create policy "cal_select_own" on public.calendar_events for select using (auth.uid() = user_id);
drop policy if exists "cal_insert_own" on public.calendar_events;
create policy "cal_insert_own" on public.calendar_events for insert with check (auth.uid() = user_id);
drop policy if exists "cal_update_own" on public.calendar_events;
create policy "cal_update_own" on public.calendar_events for update using (auth.uid() = user_id);
drop policy if exists "cal_delete_own" on public.calendar_events;
create policy "cal_delete_own" on public.calendar_events for delete using (auth.uid() = user_id);
