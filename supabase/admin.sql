-- Upward — admin flag for the dev panel. Run once. Safe to re-run.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- The "update own profile" RLS policy would otherwise let any user flip their
-- OWN is_admin via the API. This trigger rejects is_admin changes unless they
-- come from the service-role key or a direct DB connection (migrations/psql,
-- where auth.role() is null).
create or replace function public.protect_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), 'service_role') <> 'service_role' then
    raise exception 'is_admin can only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_flag on public.profiles;
create trigger protect_admin_flag
  before update on public.profiles
  for each row execute function public.protect_admin_flag();

-- Seed: @kaz is the first admin (idempotent; no-op if the username changes).
update public.profiles set is_admin = true where lower(username) = 'kaz';
