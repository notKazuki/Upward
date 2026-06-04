-- Upward — 1:1 direct messages between friends. Run once. Safe to re-run.
-- Realtime is enabled so the recipient receives new messages live (RLS-gated).

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  constraint message_not_self check (sender_id <> recipient_id)
);

create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_inbox_idx on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

-- Read messages you sent or received.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Send only as yourself, only to an accepted friend, and only if neither side
-- has blocked the other. Enforced at the DB so it can't be bypassed.
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = recipient_id) or
          (f.requester_id = recipient_id and f.addressee_id = auth.uid())
        )
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = recipient_id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = recipient_id)
    )
  );

-- The recipient can mark messages read.
drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
  for update using (auth.uid() = recipient_id);

-- Enable Realtime for live delivery (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
