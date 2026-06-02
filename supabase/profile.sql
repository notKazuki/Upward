-- Upward — profile: username + avatar. Run once in Supabase → SQL Editor.

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text;

-- Case-insensitive uniqueness (the exclusivity system).
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- Length guard (max 17 chars).
alter table public.profiles drop constraint if exists profiles_username_len;
alter table public.profiles
  add constraint profiles_username_len
  check (username is null or char_length(username) between 2 and 17);

-- Avatars storage bucket (public read).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read avatars; a user may only write to their own folder
-- (path is "<user-id>/...").
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_user_insert" on storage.objects;
create policy "avatars_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_update" on storage.objects;
create policy "avatars_user_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_delete" on storage.objects;
create policy "avatars_user_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
