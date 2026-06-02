-- Upward — gaming tracker
-- Run once in Supabase dashboard → SQL Editor. Safe to re-run.

create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  slug        text not null,
  name        text not null,
  tracker_url text,
  goals       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  game_id     uuid not null references public.games (id) on delete cascade,
  played_on   date not null default current_date,
  matches     integer not null default 0 check (matches >= 0),
  wins        integer not null default 0 check (wins >= 0),
  losses      integer not null default 0 check (losses >= 0),
  minutes     integer not null default 0 check (minutes >= 0),
  rank        text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists game_sessions_game_idx
  on public.game_sessions (game_id, played_on desc, created_at desc);

alter table public.games enable row level security;
alter table public.game_sessions enable row level security;

drop policy if exists "games_select_own" on public.games;
create policy "games_select_own" on public.games for select using (auth.uid() = user_id);
drop policy if exists "games_insert_own" on public.games;
create policy "games_insert_own" on public.games for insert with check (auth.uid() = user_id);
drop policy if exists "games_update_own" on public.games;
create policy "games_update_own" on public.games for update using (auth.uid() = user_id);
drop policy if exists "games_delete_own" on public.games;
create policy "games_delete_own" on public.games for delete using (auth.uid() = user_id);

drop policy if exists "gs_select_own" on public.game_sessions;
create policy "gs_select_own" on public.game_sessions for select using (auth.uid() = user_id);
drop policy if exists "gs_insert_own" on public.game_sessions;
create policy "gs_insert_own" on public.game_sessions for insert with check (auth.uid() = user_id);
drop policy if exists "gs_update_own" on public.game_sessions;
create policy "gs_update_own" on public.game_sessions for update using (auth.uid() = user_id);
drop policy if exists "gs_delete_own" on public.game_sessions;
create policy "gs_delete_own" on public.game_sessions for delete using (auth.uid() = user_id);
