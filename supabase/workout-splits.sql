-- Upward — training splits (run after profiles.sql and workouts.sql)
-- Adds the user's chosen split to profiles, and loosens the workouts.category
-- check so day labels (Push, Pull, custom days, …) are allowed.
-- Run once in Supabase dashboard → SQL Editor. Safe to re-run.

alter table public.profiles
  add column if not exists workout_split text,
  add column if not exists workout_split_name text,
  add column if not exists workout_days text[] not null default '{}';

alter table public.workouts
  drop constraint if exists workouts_category_check;
