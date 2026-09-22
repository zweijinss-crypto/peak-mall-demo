-- peak-mall-demo · admin RBAC + audit log (Phase 3.7)
-- Version: 0010
-- Date: 2026-09-22
--
-- Goal: replace the single 'admin' role with a 4-role matrix
-- (super_admin / ops / cs / finance) and back every admin write
-- with an audit log row.
--
-- Run via Supabase SQL editor or `supabase db push`.
-- Idempotent: safe to re-run (uses IF NOT EXISTS / DO blocks).

-- ============================================================
-- 1. Promote role enum from single string to multi-role
-- ============================================================
-- The old check constraint restricts role to ('user','admin','fx','agent').
-- We keep all of them for backward compat but allow the new admin roles.
alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('user', 'admin', 'fx', 'agent',
                  'super_admin', 'ops', 'cs', 'finance'));

-- New column: which admin role(s) this user holds, JSONB array.
-- Most users have one role; super_admin can have any combination.
alter table public.users
  add column if not exists admin_roles jsonb not null default '[]'::jsonb;

-- Backfill: existing 'admin' users become 'super_admin' on the new
-- scale (they had full access in the single-role model).
update public.users
  set admin_roles = '["super_admin"]'::jsonb
  where role = 'admin' and (admin_roles = '[]'::jsonb or admin_roles is null);

create index if not exists users_admin_roles_gin
  on public.users using gin (admin_roles);

-- ============================================================
-- 2. Permission matrix — single source of truth for RBAC checks
-- ============================================================
-- This table is documentation + lookup, not enforced at the DB level.
-- Enforced at the app layer (Netlify functions + AdminGuard).
-- Each row: which admin role can perform which action on which resource.
create table if not exists public.admin_permissions (
  role            text not null,
  resource        text not null,           -- 'orders' | 'products' | 'users' | ...
  action          text not null,           -- 'read' | 'create' | 'update' | 'delete' | 'refund' | 'payout'
  constraint admin_permissions_pkey primary key (role, resource, action),
  constraint admin_permissions_role_check check (
    role in ('super_admin', 'ops', 'cs', 'finance')
  )
);

-- super_admin: full read/write across everything.
insert into public.admin_permissions (role, resource, action) values
  ('super_admin', 'orders',     'read'),
  ('super_admin', 'orders',     'update'),
  ('super_admin', 'orders',     'refund'),
  ('super_admin', 'products',   'read'),
  ('super_admin', 'products',   'create'),
  ('super_admin', 'products',   'update'),
  ('super_admin', 'products',   'delete'),
  ('super_admin', 'users',      'read'),
  ('super_admin', 'users',      'update'),
  ('super_admin', 'agents',     'read'),
  ('super_admin', 'agents',     'update'),
  ('super_admin', 'tickets',    'read'),
  ('super_admin', 'tickets',    'update'),
  ('super_admin', 'rules',      'read'),
  ('super_admin', 'rules',      'update'),
  ('super_admin', 'comm',       'read'),
  ('super_admin', 'comm',       'update'),
  ('super_admin', 'wd',         'read'),
  ('super_admin', 'wd',         'update'),
  ('super_admin', 'home_cfg',   'read'),
  ('super_admin', 'home_cfg',   'update'),
  ('super_admin', 'support_cfg','read'),
  ('super_admin', 'support_cfg','update')
on conflict do nothing;

-- ops: catalog + orders + tickets (no payouts, no rule changes).
insert into public.admin_permissions (role, resource, action) values
  ('ops', 'products', 'read'),
  ('ops', 'products', 'create'),
  ('ops', 'products', 'update'),
  ('ops', 'orders',   'read'),
  ('ops', 'orders',   'update'),
  ('ops', 'tickets',  'read'),
  ('ops', 'tickets',  'update')
on conflict do nothing;

-- cs: tickets + read-only everything customer-facing.
insert into public.admin_permissions (role, resource, action) values
  ('cs', 'tickets', 'read'),
  ('cs', 'tickets', 'update'),
  ('cs', 'orders',  'read'),
  ('cs', 'users',   'read')
on conflict do nothing;

-- finance: orders + withdrawals + payouts (no catalog).
insert into public.admin_permissions (role, resource, action) values
  ('finance', 'orders',   'read'),
  ('finance', 'orders',   'refund'),
  ('finance', 'wd',       'read'),
  ('finance', 'wd',       'update'),
  ('finance', 'comm',     'read'),
  ('finance', 'rules',    'read')
on conflict do nothing;

-- ============================================================
-- 3. has_admin_permission(role, resource, action) — check function
-- ============================================================
create or replace function public.has_admin_permission(
  p_resource text,
  p_action text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  declare
    roles jsonb;
  begin
    select admin_roles into roles
    from public.users
    where id = auth.uid();

    if roles is null or jsonb_array_length(roles) = 0 then
      return false;
    end if;

    return exists (
      select 1
      from public.admin_permissions ap
      where ap.role = any(select jsonb_array_elements_text(roles))
        and ap.resource = p_resource
        and ap.action   = p_action
    );
  end;
$$;

-- ============================================================
-- 4. audit_log — who/when/what for every admin write
-- ============================================================
create table if not exists public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references public.users(id) on delete set null,
  actor_email  text,
  actor_role   text,
  action       text not null,             -- 'order.refund' | 'product.update' | ...
  resource     text not null,             -- 'orders' | 'products' | ...
  resource_id  text,                      -- order_no / product id / user uuid
  before       jsonb,
  after        jsonb,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id, created_at desc);
create index if not exists audit_log_resource_idx on public.audit_log(resource, resource_id, created_at desc);
create index if not exists audit_log_action_idx on public.audit_log(action, created_at desc);

-- RLS: only super_admin / ops / finance can read audit_log; no client
-- can write (writes happen via SECURITY DEFINER functions or service_role).
alter table public.audit_log enable row level security;

drop policy if exists audit_log_read_admin on public.audit_log;
create policy audit_log_read_admin on public.audit_log
  for select
  using (public.has_admin_permission('audit_log', 'read'));

-- Note: 'audit_log' resource isn't in the seed permissions table; super_admin
-- gets it via a wildcard-friendly read policy below. (Practical fix: super_admin
-- is allowed to read everything, full stop.)
drop policy if exists audit_log_read_super on public.audit_log;
create policy audit_log_read_super on public.audit_log
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.admin_roles ? 'super_admin'
    )
  );

-- ============================================================
-- 5. Convenience: log_admin_action() — single entrypoint
-- ============================================================
create or replace function public.log_admin_action(
  p_action text,
  p_resource text,
  p_resource_id text,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
  declare
    v_actor uuid := auth.uid();
    v_email text;
    v_role  text;
  begin
    select email, role into v_email, v_role
    from public.users where id = v_actor;

    insert into public.audit_log (
      actor_id, actor_email, actor_role,
      action, resource, resource_id,
      before, after, metadata
    ) values (
      v_actor, v_email, v_role,
      p_action, p_resource, p_resource_id,
      p_before, p_after, p_metadata
    );
  end;
$$;

-- ============================================================
-- 6. Update auth trigger — preserve admin role on first login
-- ============================================================
-- The handle_new_user trigger (0002_auth_trigger.sql) sets role='user'
-- for new signups. Existing admins keep their role; new admins must
-- be promoted by an existing super_admin via the admin/users page.
-- (No trigger change needed here.)

-- ============================================================
-- 7. is_admin() — extend to accept any admin_roles entry
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and (
        role = 'admin'
        or (admin_roles is not null and jsonb_array_length(admin_roles) > 0)
      )
  );
$$;
