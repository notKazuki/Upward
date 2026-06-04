-- Upward — social foundation: profile sharing, friends, blocks.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Cross-user reads (viewing someone's shared stats) are gated in server code
-- with the service-role client after checking the relationship + privacy map,
-- so the tables below keep simple "rows involving me" RLS for direct access.

-- 1. Profile additions: a short bio + a per-section privacy map.
alter table public.profiles
  add column if not exists bio     text,
  add column if not exists privacy jsonb not null default '{}'::jsonb;

alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 280);

-- 2. Friendships — one row per pair. status: 'pending' (requester → addressee)
--    or 'accepted'. Mutual once accepted; query either direction.
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint friendship_not_self check (requester_id <> addressee_id),
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- 3. Blocks — asymmetric; only the blocker sees their own blocks.
create table if not exists public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint block_not_self check (blocker_id <> blocked_id),
  constraint block_pair_unique unique (blocker_id, blocked_id)
);

create index if not exists blocks_blocker_idx on public.blocks (blocker_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select" on public.blocks;
create policy "blocks_select" on public.blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists "blocks_insert" on public.blocks;
create policy "blocks_insert" on public.blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists "blocks_delete" on public.blocks;
create policy "blocks_delete" on public.blocks
  for delete using (auth.uid() = blocker_id);
