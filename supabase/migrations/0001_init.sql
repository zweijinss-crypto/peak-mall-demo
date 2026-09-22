-- peak-mall-demo · initial schema (Supabase Postgres)
-- Version: 0001
-- Date: 2026-09-22
--
-- Run via Supabase SQL editor or `supabase db push`.
-- Idempotent: safe to re-run.

-- ============================================================
-- 0. Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. users — 1:1 with auth.users (Supabase managed auth)
-- ============================================================
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  nickname      text,
  -- Role: 'user' (default), 'admin' (RBAC for /admin/*), 'fx' / 'agent'
  role          text not null default 'user' check (role in ('user', 'admin', 'fx', 'agent')),
  status        text not null default 'active' check (status in ('active', 'frozen')),
  locale        text not null default 'zh' check (locale in ('zh', 'en')),
  currency      text not null default 'USD',
  invite_code   text,
  invited_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists users_role_idx on public.users(role);
create index if not exists users_invite_code_idx on public.users(invite_code);

-- ============================================================
-- 2. products — catalog (mirror src/data/products.ts initially)
-- ============================================================
create table if not exists public.products (
  id              bigserial primary key,
  -- bilingual fields stored as jsonb { zh, en }
  name            jsonb not null,
  category        jsonb not null,
  description     jsonb not null,
  highlights      jsonb not null default '[]'::jsonb,
  long_description jsonb not null default '[]'::jsonb,
  -- price stored as decimal (USD cents-like precision)
  price           numeric(10, 2) not null,
  compare_price   numeric(10, 2),
  cost            numeric(10, 2),
  -- inventory
  stock           integer not null default 0,
  stock_alert     integer not null default 5,
  -- images (array of urls/emoji)
  images          jsonb not null default '[]'::jsonb,
  cover           text not null,
  -- status: 1 = active, 0 = archived
  status          smallint not null default 1,
  -- audit
  seo_slug        text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_created_at_idx on public.products(created_at desc);

-- ============================================================
-- 3. orders — order header
-- ============================================================
create type order_status as enum (
  'pending',  -- placed, awaiting payment
  'paid',     -- payment confirmed (via Stripe webhook)
  'shipped',  -- admin marked shipped
  'completed',-- delivered
  'cancelled' -- user or admin cancelled
);
create type payment_status as enum (
  'pending', 'success', 'failed', 'refunded'
);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  -- Short human-readable order number e.g. "OMTRFDBIS-00"
  order_no        text not null unique,
  user_id         uuid not null references public.users(id) on delete cascade,
  -- Money
  subtotal        numeric(10, 2) not null,
  shipping        numeric(10, 2) not null default 0,
  tax             numeric(10, 2) not null default 0,
  discount        numeric(10, 2) not null default 0,
  total           numeric(10, 2) not null,
  currency        text not null default 'USD',
  -- Coupon reference (denormalised for audit)
  coupon_code     text,
  -- Status
  status          order_status not null default 'pending',
  -- Address snapshot
  ship_name       text not null,
  ship_phone      text not null,
  ship_region     text not null,
  ship_detail     text not null,
  -- Payment snapshot (denormalised; payments table holds full event log)
  payment_method  text,           -- 'stripe' | 'alipay' | ...
  payment_status  payment_status not null default 'pending',
  payment_id      text,           -- external (Stripe PaymentIntent id)
  paid_at         timestamptz,
  -- Tracking
  carrier         text,
  tracking_no     text,
  shipped_at      timestamptz,
  -- Cancellation
  cancel_reason   text,
  cancelled_at    timestamptz,
  cancelled_by    uuid references public.users(id),
  -- Audit
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ============================================================
-- 4. order_items — line items
-- ============================================================
create table if not exists public.order_items (
  id              bigserial primary key,
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      bigint not null references public.products(id) on delete restrict,
  -- Snapshot at purchase time (price/name may change later)
  product_name    jsonb not null,
  cover           text,
  unit_price      numeric(10, 2) not null,
  qty             integer not null check (qty > 0),
  subtotal        numeric(10, 2) not null
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ============================================================
-- 5. addresses — shipping address book
-- ============================================================
create table if not exists public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  name            text not null,
  phone           text not null,
  region          text not null,   -- "Country / Province / City"
  detail          text not null,   -- street + number
  zip             text,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists addresses_user_id_idx on public.addresses(user_id);

-- ============================================================
-- 6. wishlist — per-user favourites
-- ============================================================
create table if not exists public.wishlist (
  user_id         uuid not null references public.users(id) on delete cascade,
  product_id      bigint not null references public.products(id) on delete cascade,
  added_at        timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists wishlist_user_id_idx on public.wishlist(user_id);

-- ============================================================
-- 7. carts — server-side persisted carts (one per user)
-- ============================================================
create table if not exists public.carts (
  user_id         uuid primary key references public.users(id) on delete cascade,
  -- items stored as jsonb for flexibility: [{ productId, qty, selected }]
  items           jsonb not null default '[]'::jsonb,
  coupon_code     text,
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 8. payments — payment event log (immutable append-only)
-- ============================================================
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  -- External provider ids
  provider        text not null,        -- 'stripe'
  provider_event  text,                 -- e.g. 'checkout.session.completed'
  provider_intent text,                 -- e.g. Stripe PaymentIntent id
  amount          numeric(10, 2) not null,
  currency        text not null,
  status          payment_status not null,
  raw_payload     jsonb,                -- raw provider event for audit
  created_at      timestamptz not null default now()
);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_provider_intent_idx on public.payments(provider_intent);

-- ============================================================
-- 9. webhook_events — idempotent dedupe for provider webhooks
-- ============================================================
create table if not exists public.webhook_events (
  -- Provider-given unique id; on conflict we skip (idempotent)
  id              text primary key,    -- e.g. Stripe evt_xxx
  provider        text not null,
  event_type      text not null,
  payload         jsonb not null,
  processed       boolean not null default false,
  processed_at    timestamptz,
  received_at     timestamptz not null default now()
);

-- ============================================================
-- 10. after_sales — refund/ticket flow (Phase 2 fills in detail)
-- ============================================================
create type ticket_status as enum (
  'pending', 'approved', 'rejected', 'refunded'
);
create table if not exists public.after_sales (
  id              text primary key,         -- e.g. 'AS_1001'
  order_id        uuid not null references public.orders(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  reason          text not null,
  note            text,
  status          ticket_status not null default 'pending',
  amount          numeric(10, 2),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists after_sales_order_id_idx on public.after_sales(order_id);
create index if not exists after_sales_user_id_idx on public.after_sales(user_id);

-- ============================================================
-- 11. updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- 12. Row Level Security — enable (policies in 0002_rls.sql)
-- ============================================================
alter table public.users      enable row level security;
alter table public.products   enable row level security;
alter table public.orders     enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses  enable row level security;
alter table public.wishlist   enable row level security;
alter table public.carts      enable row level security;
alter table public.payments   enable row level security;
alter table public.webhook_events enable row level security;
alter table public.after_sales enable row level security;

-- ============================================================
-- 13. Helper view — order_summary for admin dashboard
-- ============================================================
create or replace view public.order_summary as
select
  o.id,
  o.order_no,
  o.user_id,
  u.email as user_email,
  o.status,
  o.payment_status,
  o.total,
  o.currency,
  o.created_at,
  count(oi.id) as item_count
from public.orders o
left join public.users u on u.id = o.user_id
left join public.order_items oi on oi.order_id = o.id
group by o.id, u.email;
