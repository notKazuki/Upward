-- Upward Pro — entitlement columns. Billing is scaffolded dormant: until Stripe
-- is wired, `is_pro` is the single source of truth and can be toggled manually.
-- Idempotent.
alter table public.profiles add column if not exists is_pro boolean not null default false;
alter table public.profiles add column if not exists pro_since timestamptz;
