-- ============================================================
-- 0005_tax_rates.sql
--
-- Phase 2.3 — Country / region tax rates.
--
-- Each (country_code, region) row maps to a percentage rate and a
-- label for display. The cart / checkout code looks up the rate by
-- the buyer-supplied shipping country, computes tax on the
-- subtotal, and writes it to orders.tax at order-create time.
--
-- Also adds snapshot columns to orders so admin can see which rate
-- was applied without joining tax_rates:
--   orders.tax_rate        numeric(5, 4)
--   orders.country_code    text  (ISO 3166-1 alpha-2)
--   orders.region_code     text  (ISO 3166-2)
--
-- Idempotent: ON CONFLICT keeps existing rows when re-run; the
-- seed block below only fills missing rows.
-- ============================================================

alter table public.orders
  add column if not exists tax_rate numeric(5, 4) not null default 0;

alter table public.orders
  add column if not exists country_code text;

alter table public.orders
  add column if not exists region_code text;

create index if not exists orders_country_idx on public.orders(country_code);

create table if not exists public.tax_rates (
  country_code    text not null,           -- ISO 3166-1 alpha-2 (e.g. 'US')
  region          text not null default '', -- ISO 3166-2 (e.g. 'CA', 'NY') or '' for country-wide
  rate            numeric(5, 4) not null,   -- 0.0825 = 8.25%
  label           jsonb not null,          -- { zh, en } e.g. "California Sales Tax"
  inclusive       boolean not null default false, -- true: rate already in price
  effective_from  date not null default '2020-01-01',
  notes           text,
  primary key (country_code, region)
);

create index if not exists tax_rates_country_idx on public.tax_rates(country_code);

alter table public.tax_rates enable row level security;

-- Anyone (including anon) can read tax rates — these are public
-- information. No auth required for the cart preview.
drop policy if exists tax_rates_public_select on public.tax_rates;
create policy on public.tax_rates_public_select
  for select using (true);

-- Only admins can write tax rates
drop policy if exists tax_rates_admin_all on public.tax_rates;
create policy on public.tax_rates_admin_all
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Service role bypass for server-side writes
drop policy if exists tax_rates_service_all on public.tax_rates;
create policy on public.tax_rates_service_all
  for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- Seed baseline rates (idempotent via ON CONFLICT DO NOTHING)
--
-- Values are reasonable approximations; verify against your
-- accountant / Stripe Tax before going live in regulated markets.
-- ------------------------------------------------------------

insert into public.tax_rates (country_code, region, rate, label, inclusive, notes)
values
  -- US state sales tax (common rates; not exhaustive)
  ('US', '',     0.0000, '{"zh": "免税 (其他州)", "en": "No sales tax"}', false, 'US default for states not listed'),
  ('US', 'CA',   0.0825, '{"zh": "加州销售税",     "en": "California Sales Tax"}', false, null),
  ('US', 'NY',   0.0400, '{"zh": "纽约州销售税",   "en": "New York Sales Tax"}', false, 'NY state base; NYC adds ~4.5%'),
  ('US', 'TX',   0.0625, '{"zh": "德州销售税",     "en": "Texas Sales Tax"}', false, null),
  ('US', 'WA',   0.0650, '{"zh": "华盛顿州销售税", "en": "Washington Sales Tax"}', false, null),
  ('US', 'FL',   0.0600, '{"zh": "佛罗里达销售税", "en": "Florida Sales Tax"}', false, null),

  -- EU VAT (per-country, standard rate; not exhaustive)
  ('DE', '',     0.1900, '{"zh": "德国增值税",     "en": "Germany VAT (19%)"}', true, 'MwSt standard rate'),
  ('FR', '',     0.2000, '{"zh": "法国增值税",     "en": "France VAT (20%)"}', true, 'TVA standard rate'),
  ('NL', '',     0.2100, '{"zh": "荷兰增值税",     "en": "Netherlands VAT (21%)"}', true, 'BTW standard rate'),
  ('IT', '',     0.2200, '{"zh": "意大利增值税",   "en": "Italy VAT (22%)"}', true, 'IVA standard rate'),
  ('ES', '',     0.2100, '{"zh": "西班牙增值税",   "en": "Spain VAT (21%)"}', true, 'IVA standard rate'),

  -- UK VAT
  ('GB', '',     0.2000, '{"zh": "英国增值税",     "en": "United Kingdom VAT (20%)"}', true, null),

  -- Canada GST/HST (province-by-province)
  ('CA', '',     0.0500, '{"zh": "加拿大 GST",     "en": "Canada GST (5%)"}', false, 'Federal only; provinces add HST'),
  ('CA', 'ON',   0.1300, '{"zh": "安大略 HST",     "en": "Ontario HST (13%)"}', false, null),
  ('CA', 'BC',   0.1200, '{"zh": "BC 省 HST",      "en": "British Columbia HST"}', false, 'GST 5% + PST 7%'),
  ('CA', 'QC',   0.1495, '{"zh": "魁北克 QST",     "en": "Quebec QST"}', false, 'GST 5% + QST 9.975%'),

  -- Asia
  ('CN', '',     0.0000, '{"zh": "中国大陆",       "en": "China Mainland"}', false, 'Most retail sales tax-free'),
  ('HK', '',     0.0000, '{"zh": "香港",           "en": "Hong Kong"}', false, 'No VAT/GST'),
  ('JP', '',     0.1000, '{"zh": "日本消费税",     "en": "Japan Consumption Tax (10%)"}', true, null),
  ('SG', '',     0.0900, '{"zh": "新加坡 GST",     "en": "Singapore GST (9%)"}', true, null),
  ('KR', '',     0.1000, '{"zh": "韩国增值税",     "en": "South Korea VAT (10%)"}', true, null),

  -- Oceania
  ('AU', '',     0.1000, '{"zh": "澳洲 GST",       "en": "Australia GST (10%)"}', true, null),
  ('NZ', '',     0.1500, '{"zh": "新西兰 GST",     "en": "New Zealand GST (15%)"}', true, null)

on conflict (country_code, region) do nothing;

comment on table public.tax_rates is
  'Per-country / per-region tax rates used at order-creation time. Read-public for storefront; admin-writable.';