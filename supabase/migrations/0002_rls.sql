-- peak-mall-demo · Row Level Security policies (Phase 1.1)
-- Version: 0002
-- Date: 2026-09-22
--
-- Defaults:
--   - users: own row read/update; admin reads all
--   - products: public read (status=1); admin write
--   - orders: own user read/create; admin read/update
--   - addresses: own user all; admin read
--   - wishlist: own user all
--   - carts: own user all
--   - payments: own user read; admin read; service_role insert (webhook)
--   - webhook_events: service_role only
--   - after_sales: own user all; admin read/update

-- ============================================================
-- Helper: is_admin() — auth.users.raw_user_meta_data->>'role' = 'admin'
-- (Phase 1.3 will swap to JWT claim)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'role')::text = 'admin',
    false
  );
$$;

-- ============================================================
-- users
-- ============================================================
drop policy if exists "users read own" on public.users;
create policy "users read own" on public.users
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "users update own" on public.users;
create policy "users update own" on public.users
  for update using (auth.uid() = id)
    with check (auth.uid() = id and role = (select role from public.users where id = auth.uid()));

drop policy if exists "users admin update" on public.users;
create policy "users admin update" on public.users
  for update using (public.is_admin());

-- ============================================================
-- products — public read of active; admin write
-- ============================================================
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (status = 1 or public.is_admin());

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- orders — own read; own insert; admin read+update
-- ============================================================
drop policy if exists "orders read own" on public.orders;
create policy "orders read own" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders update own" on public.orders;
create policy "orders update own" on public.orders
  for update using (auth.uid() = user_id and status = 'pending')
    with check (auth.uid() = user_id);

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update using (public.is_admin());

-- ============================================================
-- order_items — same access as parent order
-- ============================================================
drop policy if exists "order_items read" on public.order_items;
create policy "order_items read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "order_items insert own" on public.order_items;
create policy "order_items insert own" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items admin" on public.order_items;
create policy "order_items admin" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- addresses — own all; admin read
-- ============================================================
drop policy if exists "addresses own all" on public.addresses;
create policy "addresses own all" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "addresses admin read" on public.addresses;
create policy "addresses admin read" on public.addresses
  for select using (public.is_admin());

-- ============================================================
-- wishlist — own all
-- ============================================================
drop policy if exists "wishlist own all" on public.wishlist;
create policy "wishlist own all" on public.wishlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- carts — own all
-- ============================================================
drop policy if exists "carts own all" on public.carts;
create policy "carts own all" on public.carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- payments — own read; admin read; service_role insert (default)
-- ============================================================
drop policy if exists "payments read own" on public.payments;
create policy "payments read own" on public.payments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );
-- Inserts/updates happen via service_role (webhook handler) — no anon policy.

-- ============================================================
-- webhook_events — service_role only (no anon policy)
-- ============================================================

-- ============================================================
-- after_sales — own all; admin read/update
-- ============================================================
drop policy if exists "after_sales read own" on public.after_sales;
create policy "after_sales read own" on public.after_sales
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "after_sales insert own" on public.after_sales;
create policy "after_sales insert own" on public.after_sales
  for insert with check (auth.uid() = user_id);

drop policy if exists "after_sales admin update" on public.after_sales;
create policy "after_sales admin update" on public.after_sales
  for update using (public.is_admin());
