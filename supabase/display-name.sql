-- Upward — display name + username change cooldown.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- display_name: freely editable, shown around the app (not unique).
-- username_changed_at: when the unique username was last set, to enforce the
-- 30-day change cooldown.

alter table public.profiles
  add column if not exists display_name        text,
  add column if not exists username_changed_at timestamptz;
