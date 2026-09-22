-- peak-mall-demo · RLS policies for admin data tables (Phase 1.3)
-- Version: 0012
-- Date: 2026-09-22
--
-- Closes the gap left by 0011_admin_data.sql — that migration added
-- commissions / withdrawals / invite_codes / config_kv tables
-- WITHOUT enabling RLS, which means in a live deployment any
-- authenticated user could read/write admin data.
--
-- Pattern (mirrors 0010_admin_rbac.sql audit_log policies):
--   - public.users.is_admin() helper from 0010
--     returns true when the calling auth.uid() has role='admin'
--   - admins (role='admin') get full CRUD on admin tables
--   - non-admin callers get SELECT only on their own rows (e.g.
--     user sees only their own commission / withdrawal rows)
--
-- Idempotent: safe to re-run. Drop-then-create keeps policies
-- in sync with the latest definition without manual cleanup.

-- ============================================================
-- 1. commissions — read own; admin full
-- ============================================================
alter table public.commissions enable row level security;

drop policy if exists commissions_read_own on public.commissions;
create policy commissions_read_own on public.commissions
  for select
  using (
    user_id = auth.uid()
    or public.users.is_admin()  -- helper from 0010
  );

drop policy if exists commissions_write_admin on public.commissions;
create policy commissions_write_admin on public.commissions
  for all
  using (public.users.is_admin())
  with check (public.users.is_admin());

-- ============================================================
-- 2. withdrawals — read own; admin full
-- ============================================================
alter table public.withdrawals enable row level security;

drop policy if exists withdrawals_read_own on public.withdrawals;
create policy withdrawals_read_own on public.withdrawals
  for select
  using (
    user_id = auth.uid()
    or public.users.is_admin()
  );

drop policy if exists withdrawals_write_admin on public.withdrawals;
create policy withdrawals_write_admin on public.withdrawals
  for all
  using (public.users.is_admin())
  with check (public.users.is_admin());

-- ============================================================
-- 3. invite_codes — admin only (sensitive: codes let people sign up
--    as agents; must not be visible to regular users)
-- ============================================================
alter table public.invite_codes enable row level security;

drop policy if exists invite_codes_admin_all on public.invite_codes;
create policy invite_codes_admin_all on public.invite_codes
  for all
  using (public.users.is_admin())
  with check (public.users.is_admin());

-- ============================================================
-- 4. config_kv — admin only (rates, copy, support rules etc.)
-- ============================================================
alter table public.config_kv enable row level security;

drop policy if exists config_kv_admin_all on public.config_kv;
create policy config_kv_admin_all on public.config_kv
  for all
  using (public.users.is_admin())
  with check (public.users.is_admin());

-- ============================================================
-- 5. agent_config on users — own user can read their own agent
--    config (so /agents/* page knows its own rate/limit), admin can
--    read+write all (for admin/agents page).
-- ============================================================
-- agent_config is a JSONB column on public.users, not its own table.
-- public.users already has RLS from 0010_admin_rbac; this is a
-- no-op reminder. The column itself is exposed to the same policies
-- that gate the row.