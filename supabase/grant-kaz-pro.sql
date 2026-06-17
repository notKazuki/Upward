-- Grant @kaz a permanent Pro account (owner). Run once, after pro.sql.
-- Idempotent — safe to re-run.
update public.profiles
set is_pro = true,
    pro_since = coalesce(pro_since, now())
where username = 'kaz';
