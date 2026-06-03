-- Upward — Supplement tracker (daily stack + check off).
-- Run once in Supabase → SQL Editor. Safe to re-run.

create table if not exists public.supplements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  dose        text,
  timing      text not null default 'anytime'
                check (timing in ('morning', 'preworkout', 'postworkout', 'evening', 'anytime')),
  created_at  timestamptz not null default now()
);

create index if not exists supplements_user_idx
  on public.supplements (user_id, created_at);

-- One row = "took this supplement on this day". Toggle = insert / delete.
create table if not exists public.supplement_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  supplement_id  uuid not null references public.supplements (id) on delete cascade,
  taken_on       date not null default current_date,
  created_at     timestamptz not null default now(),
  unique (supplement_id, taken_on)
);

create index if not exists supplement_logs_idx
  on public.supplement_logs (user_id, taken_on desc);

-- Widen the timing set to include post-workout on existing installs (the inline
-- check above only applies to fresh tables).
alter table public.supplements drop constraint if exists supplements_timing_check;
alter table public.supplements drop constraint if exists supplements_timing_chk;
alter table public.supplements
  add constraint supplements_timing_chk
  check (timing in ('morning', 'preworkout', 'postworkout', 'evening', 'anytime'));

alter table public.supplements enable row level security;
alter table public.supplement_logs enable row level security;

drop policy if exists "supp_select_own" on public.supplements;
create policy "supp_select_own" on public.supplements for select using (auth.uid() = user_id);
drop policy if exists "supp_insert_own" on public.supplements;
create policy "supp_insert_own" on public.supplements for insert with check (auth.uid() = user_id);
drop policy if exists "supp_update_own" on public.supplements;
create policy "supp_update_own" on public.supplements for update using (auth.uid() = user_id);
drop policy if exists "supp_delete_own" on public.supplements;
create policy "supp_delete_own" on public.supplements for delete using (auth.uid() = user_id);

drop policy if exists "supplog_select_own" on public.supplement_logs;
create policy "supplog_select_own" on public.supplement_logs for select using (auth.uid() = user_id);
drop policy if exists "supplog_insert_own" on public.supplement_logs;
create policy "supplog_insert_own" on public.supplement_logs for insert with check (auth.uid() = user_id);
drop policy if exists "supplog_delete_own" on public.supplement_logs;
create policy "supplog_delete_own" on public.supplement_logs for delete using (auth.uid() = user_id);
