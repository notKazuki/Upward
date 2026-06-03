-- Upward — game auto-sync (provider connection + imported-match dedupe).
-- Run once. Safe to re-run. Powers Dota 2 sync via OpenDota (no API key needed);
-- the same columns generalise to other providers (e.g. Riot) later.

alter table public.games
  add column if not exists provider       text,
  add column if not exists provider_id    text,
  add column if not exists last_synced_at timestamptz;

alter table public.game_sessions
  add column if not exists external_id text,
  add column if not exists source      text;

-- One imported match → one session; this stops re-syncing from duplicating.
create unique index if not exists game_sessions_external_idx
  on public.game_sessions (game_id, external_id)
  where external_id is not null;
