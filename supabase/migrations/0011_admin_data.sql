-- peak-mall-demo · admin data tables (Phase 1.1.8)
-- Version: 0011
-- Date: 2026-09-22
--
-- Adds tables / columns the admin console hydrates from:
--   1. agent_config (jsonb) on public.users  — for admin/agents page
--   2. public.commissions      — for admin/comm page
--   3. public.withdrawals      — for admin/wd + admin/wd-center
--   4. public.invite_codes     — for admin/invite
--   5. public.config_kv        — single-row config for home/support/rules
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. agent_config on users
-- ============================================================
alter table public.users
  add column if not exists agent_config jsonb;

-- ============================================================
-- 2. commissions — settled commission events (for admin/comm list)
-- ============================================================
create table if not exists public.commissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  -- Snapshot of the source order
  order_id        uuid not null references public.orders(id) on delete cascade,
  order_no        text not null,
  amount          numeric(10, 2) not null,
  rate            numeric(5, 2) not null,    -- % applied
  -- Settled or still pending (computed by nightly cron or inline)
  status          text not null default 'settled' check (status in ('settled', 'pending')),
  created_at      timestamptz not null default now()
);
create index if not exists commissions_user_id_idx on public.commissions(user_id);
create index if not exists commissions_created_at_idx on public.commissions(created_at desc);

-- ============================================================
-- 3. withdrawals — payout requests (admin/wd + admin/wd-center)
-- ============================================================
create type withdrawal_status as enum (
  'pending', 'approved', 'paid', 'rejected'
);

create table if not exists public.withdrawals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  amount          numeric(10, 2) not null,
  fee             numeric(10, 2) not null default 0,
  method          text not null check (method in ('usdt_trc20', 'card')),
  status          withdrawal_status not null default 'pending',
  reject_reason   text,
  bound_address   text,
  account         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists withdrawals_status_idx on public.withdrawals(status);
create index if not exists withdrawals_user_id_idx on public.withdrawals(user_id);

-- ============================================================
-- 4. invite_codes — admin/invite CRUD
-- ============================================================
create table if not exists public.invite_codes (
  code            text primary key,
  used            integer not null default 0,
  -- usage_limit null = unlimited
  usage_limit     integer,
  status          text not null default 'active' check (status in ('active', 'disabled')),
  created_at      timestamptz not null default now()
);
create index if not exists invite_codes_status_idx on public.invite_codes(status);

-- ============================================================
-- 5. config_kv — single-row JSON config bag for home/support/rules
-- ============================================================
create table if not exists public.config_kv (
  -- Singleton row, id always 1
  id              integer primary key default 1 check (id = 1),
  home            jsonb not null default '{}'::jsonb,   -- { title, sub, notice }
  support         jsonb not null default '{}'::jsonb,   -- { name, url, hours }
  rules           jsonb not null default '{}'::jsonb,   -- { rates, min_withdraw, withdraw_fee, commission_on, auto_approve }
  updated_at      timestamptz not null default now()
);

-- Seed singleton row.
insert into public.config_kv (id, home, support, rules)
values (
  1,
  jsonb_build_object('title', '全球精选 · 品质好物', 'sub', '官方直采 · 正品保障 · 多仓直发', 'notice', '新用户注册即享专属礼遇 · 全场正品保障'),
  jsonb_build_object('name', 'Memento Care', 'url', 'https://t.me/MementoCare', 'hours', '13:00 - 23:30'),
  jsonb_build_object('rates', jsonb_build_array(10), 'min_withdraw', 10, 'withdraw_fee', 2, 'commission_on', true, 'auto_approve', false)
)
on conflict (id) do nothing;