-- Upward — Supabase advisor fixes. Run once (re-runs are no-ops).
-- Named zz-* so the migration runner applies it AFTER every table/policy file.
--
-- Fixes the "auth_rls_initplan" performance lint: policies that call
-- auth.uid()/auth.role()/auth.jwt() directly re-evaluate the function for
-- EVERY row. Wrapping the call in a scalar subquery makes Postgres evaluate it
-- once per statement. This block rewrites every policy (public + storage)
-- that still uses a bare call; already-wrapped policies are skipped, so
-- re-running the full migration set converges.

do $$
declare
  p record;
  new_qual text;
  new_check text;
  cmd text;
begin
  for p in
    select schemaname, tablename, policyname, cmd as pcmd, qual, with_check, roles
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        (qual is not null and qual ~ 'auth\.(uid|role|jwt)\(\)' and qual not ilike '%select auth.%')
        or
        (with_check is not null and with_check ~ 'auth\.(uid|role|jwt)\(\)' and with_check not ilike '%select auth.%')
      )
  loop
    new_qual := replace(replace(replace(
      p.qual,
      'auth.uid()',  '(select auth.uid())'),
      'auth.role()', '(select auth.role())'),
      'auth.jwt()',  '(select auth.jwt())');
    new_check := replace(replace(replace(
      p.with_check,
      'auth.uid()',  '(select auth.uid())'),
      'auth.role()', '(select auth.role())'),
      'auth.jwt()',  '(select auth.jwt())');

    cmd := format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    execute cmd;

    cmd := format(
      'create policy %I on %I.%I for %s to %s',
      p.policyname, p.schemaname, p.tablename,
      lower(p.pcmd),
      array_to_string(p.roles, ', ')
    );
    if new_qual is not null then
      cmd := cmd || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      cmd := cmd || format(' with check (%s)', new_check);
    end if;
    execute cmd;
  end loop;
end $$;
