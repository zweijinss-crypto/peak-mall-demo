-- peak-mall-demo · after_sales schema alignment (Phase 1.4)
-- Version: 0013
-- Date: 2026-10-29
--
-- Fixes two real defects that make /admin/tickets fail against a live
-- Supabase database:
--
--   1. STATUS VOCABULARY MISMATCH
--      0001_init.sql created the enum `ticket_status` as
--        ('pending','approved','rejected','refunded')
--      but the app writes and reads
--        ('open','replied','closed')
--      (src/app/admin/tickets/tickets-client.tsx, src/lib/api/admin-tickets-api.ts).
--      Every admin status update therefore hit an invalid enum value and
--      was rejected by Postgres — reply/close silently did nothing.
--
--   2. MISSING COLUMNS
--      The app reads/writes `updated_at` and `reply` on after_sales:
--        .update({ status, updated_at: ... })
--        select(id, ..., created_at, updated_at, ...)
--      Neither column existed — `updated_at` was never added by 0001 or any
--      later migration, and there was no `reply` column to store the
--      agent's reply text.
--
-- Approach: migrate the enum in place via a new type, backfill rows from
-- the legacy vocabulary, then drop the old type. Using a NEW type name
-- (rather than ALTER TYPE ... ADD VALUE) keeps the rename atomic and
-- lets us convert existing rows in the same transaction.
--
-- Idempotent: safe to re-run. Every step is guarded.

-- ============================================================
-- 1. New status vocabulary
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status_v2') then
    create type public.ticket_status_v2 as enum ('open', 'replied', 'closed');
  end if;
end $$;

-- ============================================================
-- 2. Widen the column to the new type, backfilling legacy values
-- ============================================================
do $$
begin
  -- Only convert when the column is still the old enum type.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'after_sales'
      and column_name = 'status'
      and udt_name = 'ticket_status'
  ) then
    alter table public.after_sales
      alter column status type public.ticket_status_v2
      using (
        case status::text
          when 'pending'  then 'open'
          when 'approved' then 'replied'
          when 'rejected' then 'closed'
          when 'refunded' then 'closed'
          else 'open'
        end
      )::public.ticket_status_v2;

    -- Drop the now-unused legacy enum (only if nothing else uses it).
    if not exists (
      select 1 from pg_type t
      join pg_depend d on d.objid = t.oid
      where t.typname = 'ticket_status'
        and d.deptype = 'e'
        and d.classid = 'pg_type'::regclass
        and d.refobjid <> 0
    ) then
      drop type public.ticket_status;
    end if;
  end if;
end $$;

-- Rename v2 -> ticket_status so the app-facing name stays stable.
do $$
begin
  if exists (select 1 from pg_type where typname = 'ticket_status_v2')
     and not exists (select 1 from pg_type where typname = 'ticket_status') then
    alter type public.ticket_status_v2 rename to ticket_status;
  end if;
end $$;

-- ============================================================
-- 3. Missing columns: updated_at + reply
-- ============================================================
alter table public.after_sales
  add column if not exists updated_at timestamptz not null default now();

alter table public.after_sales
  add column if not exists reply text;

-- ============================================================
-- 4. Auto-update updated_at on write
--    0001_init.sql created public.set_updated_at() but never attached a
--    trigger to after_sales (only users / products / orders got one).
-- ============================================================
drop trigger if exists after_sales_updated_at on public.after_sales;
create trigger after_sales_updated_at
  before update on public.after_sales
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. Index for the admin list (filter by status, newest first)
-- ============================================================
create index if not exists after_sales_status_idx on public.after_sales(status);
create index if not exists after_sales_created_at_idx on public.after_sales(created_at desc);
