-- Upward — in-app notifications (bell). Run once. Safe to re-run.
-- Self-notifications (e.g. achievement earned) are inserted with the user's own
-- session; cross-user ones (friend requests, announcements) are inserted by
-- server code with the service-role key, which bypasses RLS.

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null,            -- 'achievement' | 'friend_request' | 'friend_accept' | 'announcement' | ...
  title      text not null,
  body       text,
  href       text,                     -- in-app link the notification opens
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_insert_own" on public.notifications;
create policy "notif_insert_own" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notif_delete_own" on public.notifications;
create policy "notif_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);
