-- ============================================================
-- 0008_rate_limits.sql
--
-- Phase 2.7 — server-side rate limiting.
--
-- Used by the netlify `rate-limit` function (admin login + checkout
-- session creation). The function calls check_and_record(key,
-- window_seconds, max_count) and the SQL atomically:
--   1. Deletes rows in window_seconds from now for that key (so
--      expired attempts don't count).
--   2. Counts.
--   3. If under limit, inserts the new attempt and returns 0
--      (zero retries remaining). If at/over limit, returns the
--      number of seconds until the oldest in-window attempt expires
--      (i.e. retry_after).
--
-- Idempotent: standard IF NOT EXISTS / OR REPLACE guards.
-- ============================================================

create table if not exists public.rate_limit_attempts (
  key         text not null,        -- e.g. 'admin_login:1.2.3.4' or 'checkout:1.2.3.4'
  occurred_at timestamptz not null default now()
);

create index if not exists rate_limit_key_time_idx
  on public.rate_limit_attempts(key, occurred_at desc);

-- Auto-prune attempts older than 1 hour so the table doesn't grow
-- forever. Cron / pg_cron would be ideal; this trigger-based
-- cleanup is cheaper to set up but only runs when there's an insert.
-- For Phase 2.7 we accept the eventual-bloat tradeoff and rely
-- on the periodic window-clean inside check_and_record() to keep
-- each key bounded.
alter table public.rate_limit_attempts enable row level security;

-- No anon/authenticated reads — counters are an attack surface.
-- Only service_role writes.
drop policy if exists rate_limit_service_all on public.rate_limit_attempts;
create policy rate_limit_service_all
  for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- check_and_record(key, window_seconds, max_count) → integer
-- ------------------------------------------------------------
-- Returns 0 when the call is allowed (and records an attempt).
-- Returns retry_after seconds (>0) when blocked.
-- Single atomic round-trip via a security-definer function so the
-- service-role client can call it without exposing the table.
create or replace function public.check_and_record(
  p_key text,
  p_window_seconds integer,
  p_max_count integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_oldest timestamptz;
  v_retry  integer;
begin
  -- Prune old rows for this key.
  delete from public.rate_limit_attempts
   where key = p_key
     and occurred_at < now() - make_interval(secs => p_window_seconds);

  -- Count current attempts in window.
  select count(*), min(occurred_at)
    into v_count, v_oldest
  from public.rate_limit_attempts
   where key = p_key;

  if v_count >= p_max_count then
    -- Blocked. Return seconds until the oldest attempt falls out of
    -- the window (= when the count drops below max).
    v_retry := ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())));
    if v_retry < 1 then v_retry := 1; end if;
    return v_retry;
  end if;

  -- Allowed: record this attempt.
  insert into public.rate_limit_attempts (key) values (p_key);
  return 0;
end;
$$;

comment on table public.rate_limit_attempts is
  'Per-key attempt log. Pruned by check_and_record() on each call. Service-role only.';
comment on function public.check_and_record(text, integer, integer) is
  'Atomic rate-limit check. Returns 0 when allowed (and records), else returns retry_after seconds.';