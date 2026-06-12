-- Cosmetics — the user's equipped identity items (earned title + accent).
-- A single jsonb column on profiles. Idempotent; re-runs are no-ops. Existing
-- "update own profile" RLS already covers it (no new policy needed).

alter table public.profiles
  add column if not exists cosmetics jsonb;
