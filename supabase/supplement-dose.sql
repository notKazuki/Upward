-- Upward — per-day dose override on supplement logs ("I took this much
-- instead of my usual"). Run once. Safe to re-run.

alter table public.supplement_logs
  add column if not exists dose_taken text;

alter table public.supplement_logs drop constraint if exists supplement_logs_dose_len;
alter table public.supplement_logs
  add constraint supplement_logs_dose_len
  check (dose_taken is null or char_length(dose_taken) <= 40);
