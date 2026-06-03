-- Upward — Journal (mood + text + photos). Run once. Safe to re-run.

create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_date  date not null default current_date,
  mood        text check (mood in ('great', 'good', 'okay', 'low', 'rough')),
  body        text,
  image_paths text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists journal_entries_idx
  on public.journal_entries (user_id, entry_date desc, created_at desc);

alter table public.journal_entries enable row level security;

drop policy if exists "journal_select_own" on public.journal_entries;
create policy "journal_select_own" on public.journal_entries for select using (auth.uid() = user_id);
drop policy if exists "journal_insert_own" on public.journal_entries;
create policy "journal_insert_own" on public.journal_entries for insert with check (auth.uid() = user_id);
drop policy if exists "journal_update_own" on public.journal_entries;
create policy "journal_update_own" on public.journal_entries for update using (auth.uid() = user_id);
drop policy if exists "journal_delete_own" on public.journal_entries;
create policy "journal_delete_own" on public.journal_entries for delete using (auth.uid() = user_id);

-- Private bucket for journal photos (no public read — access via signed URLs).
insert into storage.buckets (id, name, public)
values ('journal', 'journal', false)
on conflict (id) do nothing;

-- Each user may only read/write/delete files in their own "<user-id>/..." folder.
drop policy if exists "journal_obj_select_own" on storage.objects;
create policy "journal_obj_select_own" on storage.objects
  for select using (
    bucket_id = 'journal' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal_obj_insert_own" on storage.objects;
create policy "journal_obj_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'journal' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal_obj_delete_own" on storage.objects;
create policy "journal_obj_delete_own" on storage.objects
  for delete using (
    bucket_id = 'journal' and (storage.foldername(name))[1] = auth.uid()::text
  );
