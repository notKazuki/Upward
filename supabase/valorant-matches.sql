-- Upward — global Valorant match archive.
-- One row per match_id, shared across all users: a growing dataset that powers
-- richer features later WITHOUT extra API calls (everything reads from here).
-- Rows are written server-side with the service_role key (see
-- src/lib/supabase/admin.ts), so no INSERT policy is needed — service_role
-- bypasses RLS. Authenticated users may read.
-- Run once. Safe to re-run.

create table if not exists public.valorant_matches (
  match_id   text primary key,
  region     text,
  map        text,
  mode       text,
  started_at timestamptz,
  duration_s integer,
  raw        jsonb not null,        -- full HenrikDev v4 match, so no field is ever lost
  created_at timestamptz not null default now()
);

create index if not exists valorant_matches_started_idx
  on public.valorant_matches (started_at desc);

alter table public.valorant_matches enable row level security;

-- Read-only for signed-in users; all writes go through service_role.
drop policy if exists "valm_select_auth" on public.valorant_matches;
create policy "valm_select_auth" on public.valorant_matches
  for select using (auth.role() = 'authenticated');
