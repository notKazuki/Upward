-- Upward — nutrition goal (lose / maintain / gain). Run once in Supabase →
-- SQL Editor. Safe to re-run. Drives the goal-adjusted target suggestion.

alter table public.profiles
  add column if not exists nutrition_goal text not null default 'maintain'
    check (nutrition_goal in ('lose', 'maintain', 'gain'));
