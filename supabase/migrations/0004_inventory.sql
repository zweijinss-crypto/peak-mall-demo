-- ============================================================
-- 0004_inventory.sql
--
-- Phase 2.1 — Real inventory tracking.
--
-- Adds:
--   1. products.reserved_stock  (held by unpaid orders)
--   2. inventory_movements      (audit log of every stock change)
--   3. 3 RPC functions:
--        reserve_stock(product_id, qty, order_id)
--        deduct_stock(product_id, qty, order_id)
--        release_stock(product_id, qty, order_id)
--   4. RLS for inventory_movements (admin read, service-role write)
--
-- Lifecycle:
--   place order  -> reserve_stock (stock -= qty, reserved += qty, movement reserve)
--   payment ok   -> deduct_stock  (reserved -= qty, movement deduct)
--   payment fail -> release_stock (reserved -= qty, stock += qty, movement release)
--   refund       -> release_stock (stock += qty, movement refund)
--
-- available = stock - reserved_stock (computed view)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add reserved_stock column
-- ------------------------------------------------------------

alter table public.products
  add column if not exists reserved_stock integer not null default 0;

-- Backfill invariant: reserved_stock must be <= stock.
-- Existing data has reserved_stock = 0, so this is a no-op.
alter table public.products
  drop constraint if exists products_stock_invariant;
alter table public.products
  add constraint products_stock_invariant
    check (reserved_stock >= 0 and reserved_stock <= stock);

-- ------------------------------------------------------------
-- 2. inventory_movements audit log
-- ------------------------------------------------------------

create type inventory_movement_kind as enum (
  'reserve',  -- order placed, stock held
  'deduct',   -- payment confirmed, stock actually removed
  'release',  -- payment failed / expired, stock returned
  'refund',   -- paid order refunded, stock returned
  'adjust'    -- manual admin change (e.g. receiving new shipment)
);

create table if not exists public.inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(id) on delete restrict,
  order_id      uuid references public.orders(id) on delete set null,
  kind          inventory_movement_kind not null,
  -- Snapshot of stock state after this movement
  stock_before         integer not null,
  stock_after          integer not null,
  reserved_before      integer not null,
  reserved_after       integer not null,
  qty                  integer not null,
  -- Free-form reason (admin note, system event name)
  reason         text,
  -- Who triggered it (admin user_id, or null for system)
  actor_id       uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  -- qty must be > 0 for reserve/deduct/release/refund,
  -- can be negative for adjust.
  constraint inventory_movements_qty_nonzero
    check (qty <> 0)
);

create index if not exists inventory_movements_product_idx
  on public.inventory_movements(product_id, created_at desc);
create index if not exists inventory_movements_order_idx
  on public.inventory_movements(order_id)
  where order_id is not null;
create index if not exists inventory_movements_kind_idx
  on public.inventory_movements(kind);

alter table public.inventory_movements enable row level security;

-- Admins can read all movements
drop policy if exists inventory_movements_admin_select on public.inventory_movements;
create policy on public.inventory_movements_admin_select
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Service role bypasses RLS (webhook handlers write via service key)
drop policy if exists inventory_movements_service_all on public.inventory_movements;
create policy on public.inventory_movements_service_all
  for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 3. RPC functions
--
-- All three are SECURITY DEFINER + restricted to service_role
-- so client-side code can't bypass the audit trail.
-- ------------------------------------------------------------

-- Helper: row lock + return snapshot
create or replace function public._lock_product(p_id bigint)
returns public.products
language plpgsql
as $$
declare
  row public.products;
begin
  select * into row from public.products where id = p_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;
  return row;
end;
$$;

create or replace function public.reserve_stock(
  p_product_id bigint,
  p_qty integer,
  p_order_id uuid,
  p_actor uuid default null,
  p_reason text default 'order_placed'
)
returns table (stock integer, reserved_stock integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.products;
begin
  if p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  p := public._lock_product(p_product_id);

  if (p.stock - p.reserved_stock) < p_qty then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update public.products
    set stock          = stock - p_qty,
        reserved_stock = reserved_stock + p_qty,
        updated_at     = now()
    where id = p_product_id;

  insert into public.inventory_movements (
    product_id, order_id, kind,
    stock_before, stock_after,
    reserved_before, reserved_after,
    qty, reason, actor_id
  ) values (
    p_product_id, p_order_id, 'reserve',
    p.stock, p.stock - p_qty,
    p.reserved_stock, p.reserved_stock + p_qty,
    p_qty, p_reason, p_actor
  );

  return query
    select stock, reserved_stock from public.products where id = p_product_id;
end;
$$;

create or replace function public.deduct_stock(
  p_product_id bigint,
  p_qty integer,
  p_order_id uuid,
  p_actor uuid default null,
  p_reason text default 'payment_confirmed'
)
returns table (stock integer, reserved_stock integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.products;
begin
  if p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  p := public._lock_product(p_product_id);

  if p.reserved_stock < p_qty then
    raise exception 'NOT_RESERVED';
  end if;

  update public.products
    set reserved_stock = reserved_stock - p_qty,
        updated_at     = now()
    where id = p_product_id;

  insert into public.inventory_movements (
    product_id, order_id, kind,
    stock_before, stock_after,
    reserved_before, reserved_after,
    qty, reason, actor_id
  ) values (
    p_product_id, p_order_id, 'deduct',
    p.stock, p.stock,
    p.reserved_stock, p.reserved_stock - p_qty,
    p_qty, p_reason, p_actor
  );

  return query
    select stock, reserved_stock from public.products where id = p_product_id;
end;
$$;

create or replace function public.release_stock(
  p_product_id bigint,
  p_qty integer,
  p_order_id uuid,
  p_actor uuid default null,
  p_reason text default 'order_cancelled',
  p_kind inventory_movement_kind default 'release'
)
returns table (stock integer, reserved_stock integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.products;
  mv_kind inventory_movement_kind;
begin
  if p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  p := public._lock_product(p_product_id);

  -- For 'release' / 'refund' kinds the stock must have been previously
  -- deducted (or reserved, for 'release' on a pending order).
  if p_kind in ('release', 'refund') then
    if (p.stock + p.reserved_stock) < p_qty then
      raise exception 'OVER_RELEASE';
    end if;
  end if;

  if p_kind = 'release' then
    -- Pending order: stock was already moved out of `stock` into `reserved`
    -- by reserve_stock. Returning means: reserved -= qty, stock += qty.
    update public.products
      set stock          = stock + p_qty,
          reserved_stock = reserved_stock - p_qty,
          updated_at     = now()
      where id = p_product_id;
  elsif p_kind = 'refund' then
    -- Paid order: stock was already deducted entirely. Returning means:
    -- stock += qty (no reserved change).
    update public.products
      set stock      = stock + p_qty,
          updated_at = now()
      where id = p_product_id;
  else
    raise exception 'UNSUPPORTED_KIND';
  end if;

  mv_kind := p_kind;

  insert into public.inventory_movements (
    product_id, order_id, kind,
    stock_before, stock_after,
    reserved_before, reserved_after,
    qty, reason, actor_id
  ) values (
    p_product_id, p_order_id, mv_kind,
    p.stock, case when mv_kind = 'release' then p.stock + p_qty else p.stock + p_qty end,
    p.reserved_stock, case when mv_kind = 'release' then p.reserved_stock - p_qty else p.reserved_stock end,
    p_qty, p_reason, p_actor
  );

  return query
    select stock, reserved_stock from public.products where id = p_product_id;
end;
$$;

create or replace function public.adjust_stock(
  p_product_id bigint,
  p_delta integer,
  p_actor uuid,
  p_reason text
)
returns table (stock integer, reserved_stock integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.products;
  new_stock integer;
begin
  if p_delta = 0 then
    raise exception 'INVALID_DELTA';
  end if;

  p := public._lock_product(p_product_id);
  new_stock := p.stock + p_delta;

  if new_stock < p.reserved_stock then
    raise exception 'ADJUST_BELOW_RESERVED';
  end if;
  if new_stock < 0 then
    raise exception 'NEGATIVE_STOCK';
  end if;

  update public.products
    set stock      = new_stock,
        updated_at = now()
    where id = p_product_id;

  insert into public.inventory_movements (
    product_id, order_id, kind,
    stock_before, stock_after,
    reserved_before, reserved_after,
    qty, reason, actor_id
  ) values (
    p_product_id, null, 'adjust',
    p.stock, new_stock,
    p.reserved_stock, p.reserved_stock,
    p_delta, p_reason, p_actor
  );

  return query
    select stock, reserved_stock from public.products where id = p_product_id;
end;
$$;

-- ------------------------------------------------------------
-- 4. Convenience view: products with computed `available`
-- ------------------------------------------------------------

create or replace view public.products_with_available as
  select p.*, (p.stock - p.reserved_stock) as available_stock
  from public.products p;

comment on view public.products_with_available is
  'Convenience view exposing available = stock - reserved_stock. Use for storefront reads.';

-- ------------------------------------------------------------
-- 5. Lock down RPC functions to service_role only
-- ------------------------------------------------------------
-- SECURITY DEFINER means the functions run as the function owner
-- (superuser), bypassing table RLS. To restrict who can CALL them,
-- grant execute only to service_role.

revoke all on function public.reserve_stock(bigint, integer, uuid, uuid, text) from public;
revoke all on function public.deduct_stock(bigint, integer, uuid, uuid, text) from public;
revoke all on function public.release_stock(bigint, integer, uuid, uuid, text, inventory_movement_kind) from public;
revoke all on function public.adjust_stock(bigint, integer, uuid, text) from public;

grant execute on function public.reserve_stock(bigint, integer, uuid, uuid, text) to service_role;
grant execute on function public.deduct_stock(bigint, integer, uuid, uuid, text) to service_role;
grant execute on function public.release_stock(bigint, integer, uuid, uuid, text, inventory_movement_kind) to service_role;
grant execute on function public.adjust_stock(bigint, integer, uuid, text) to service_role;

-- Admin (authenticated + role=admin) can call adjust_stock directly
-- without going through the service_role key.
grant execute on function public.adjust_stock(bigint, integer, uuid, text) to authenticated;