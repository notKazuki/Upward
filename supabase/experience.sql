-- Upward — experience mode (gamified | classic), chosen at onboarding and
-- switchable in Settings. Null for pre-existing users → treated as gamified.
-- Run once. Safe to re-run.
alter table public.profiles add column if not exists experience text;
