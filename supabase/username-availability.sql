-- Upward — username availability check that works under RLS.
--
-- The profiles SELECT policy is `auth.uid() = id`, so a normal query can't see
-- other users' rows — the live "is this taken?" check always returned available
-- and only the unique index caught it on save. This SECURITY DEFINER function
-- checks across all rows and returns just a boolean (no data is exposed).
-- Run once in Supabase → SQL Editor. Safe to re-run.

create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(candidate)
      and id <> auth.uid()
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to authenticated;
