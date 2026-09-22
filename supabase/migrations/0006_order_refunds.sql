-- ============================================================
-- 0006_order_refunds.sql
--
-- Phase 2.4 — refund audit log + order-level refund summary.
--
-- An order can be refunded multiple times (partial refunds are
-- supported by Stripe): every Stripe refund event produces a
-- distinct row here. `orders.refund_state` rolls up the aggregate
-- state so admins can answer "is this fully refunded?" without
-- joining.
--
-- Idempotent: all DDL uses IF NOT EXISTS / OR REPLACE.
-- ============================================================

create type if not exists refund_state as enum (
  'none',     -- no refund attempted yet
  'partial',  -- at least one refund issued, total < orders.total
  'full'      -- sum of refunds >= orders.total
);

create type if not exists refund_status as enum (
  'pending',   -- admin clicked "refund", Stripe call queued
  'succeeded', -- Stripe API returned ok; webhook may downgrade to failed
  'failed',    -- Stripe API error or webhook reported failure
  'canceled'   -- admin canceled before Stripe processed it
);

alter table public.orders
  add column if not exists refund_state  refund_state  not null default 'none';

alter table public.orders
  add column if not exists refunded_at   timestamptz;

alter table public.orders
  add column if not exists refund_amount numeric(10, 2) not null default 0;

create index if not exists orders_refund_state_idx on public.orders(refund_state);

create table if not exists public.order_refunds (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,

  -- Stripe linkage
  stripe_refund_id    text unique,                 -- re_123…; null when local-only (pre-Stripe)
  stripe_payment_intent text,                      -- pi_123…
  stripe_charge_id    text,                        -- ch_123…

  -- Money (USD; matches orders.currency scale)
  amount              numeric(10, 2) not null check (amount > 0),
  currency            text not null default 'USD',
  reason              text,                        -- admin-typed "duplicate", "damaged", …
  note                text,                        -- free-form note for the audit trail

  -- Lifecycle
  status              refund_status not null default 'pending',
  requested_by        uuid references public.users(id) on delete set null,
  requested_at        timestamptz not null default now(),
  processed_at        timestamptz,
  error_message       text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists order_refunds_order_idx on public.order_refunds(order_id);
create index if not exists order_refunds_status_idx on public.order_refunds(status);

-- Auto-update updated_at
drop trigger if exists order_refunds_set_updated_at on public.order_refunds;
create trigger order_refunds_set_updated_at
  before update on public.order_refunds
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.order_refunds enable row level security;

-- Admins see all refunds
drop policy if exists order_refunds_admin_select on public.order_refunds;
create policy order_refunds_admin_select
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Buyers see refunds for their own orders
drop policy if exists order_refunds_owner_select on public.order_refunds;
create policy order_refunds_owner_select
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_refunds.order_id and o.user_id = auth.uid()
    )
  );

-- Inserts go through the service-role client (admin netlify
-- function); no anon / authenticated write path.
drop policy if exists order_refunds_service_all on public.order_refunds;
create policy order_refunds_service_all
  for all using (auth.role() = 'service_role');

-- ============================================================
-- Helper: recompute orders.refund_state / refund_amount / refunded_at
-- from the order_refunds table. Called by the admin refund
-- netlify function and by the stripe webhook.
-- ============================================================
create or replace function public.recompute_order_refund_state(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total   numeric(10, 2);
  v_sum     numeric(10, 2);
  v_state   refund_state;
  v_when    timestamptz;
begin
  select total into v_total from public.orders where id = p_order_id;
  if v_total is null then
    return;
  end if;

  select coalesce(sum(amount), 0), max(processed_at)
    into v_sum, v_when
  from public.order_refunds
  where order_id = p_order_id
    and status = 'succeeded';

  if v_sum <= 0 then
    v_state := 'none';
  elsif v_sum >= v_total then
    v_state := 'full';
  else
    v_state := 'partial';
  end if;

  update public.orders
    set refund_state  = v_state,
        refund_amount = v_sum,
        refunded_at   = case when v_state = 'full' then coalesce(v_when, now()) else refunded_at end,
        payment_status = case when v_state = 'full' then 'refunded'::payment_status else payment_status end,
        status         = case when v_state = 'full' then 'cancelled'::order_status else status end,
        updated_at     = now()
    where id = p_order_id;
end;
$$;

comment on table public.order_refunds is
  'Per-Stripe-refund audit log. One row per refund event (partial refunds supported). Admin-readable; service-role writable.';
comment on function public.recompute_order_refund_state(uuid) is
  'Recompute orders.refund_state / refund_amount / refunded_at / payment_status from order_refunds. Called by admin refund netlify function and stripe-webhook.';
