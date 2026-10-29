-- peak-mall-demo · commission settlement + withdrawal payout (Phase 1.4)
-- Version: 0014
-- Date: 2026-10-29
--
-- Fixes a REAL correctness gap, not a cosmetic one:
--
--   1. MISSING BALANCE COLUMN
--      public.users has NO `balance` column. Any migration earlier than
--      this one never added one. Meanwhile:
--        - src/lib/api/admin-users-api.ts hardcoded `balance: 0`
--        - src/lib/api/admin-agents-api.ts hardcoded `balance: 0`
--        - the admin UI (wd-center, users, agents) displayed $0.00 for
--          every single user
--      So the whole "available balance" concept was fake.
--
--   2. PROMISE WITHOUT IMPLEMENTATION
--      The admin copy said:
--        comm.settleConfirmBody:
--          "将把这条佣金流水标记为「已结算」,金额 {amount} 将计入该用户的可用余额。"
--        wd.paidBody:
--          "标记该申请已实际到账。此操作会从用户余额中扣除提现金额。"
--      But setCommStatus() only did `update commissions set status=...`
--      and setWdStatus() only did `update withdrawals set status=...`.
--      Neither touched the user's balance. The UI promised a money
--      movement that never happened.
--
--   3. NON-ATOMIC WRITE PATH
--      Even if we added the column, doing "update commission + update
--      balance" from the browser would be two independent statements.
--      If the second one failed, the commission would be marked settled
--      but the money would never be credited. A retry would double-pay.
--
-- Approach: two SECURITY DEFINER functions that do the money movement
-- inside a single transaction with a row lock on the user row. The
-- client calls them via .rpc(); it never writes the balance directly.
--
-- Idempotent: safe to re-run. Every step is guarded.

-- ============================================================
-- 1. balance column on public.users
-- ============================================================
alter table public.users
  add column if not exists balance numeric(12, 2) not null default 0;

comment on column public.users.balance is
  'Available withdrawable balance in USD. Credited by settle_commission(), debited by mark_withdrawal_paid().';

-- ============================================================
-- 2. settle_commission(p_commission_id) — mark settled + credit balance
--
--    Idempotent: settling an already-settled commission is a no-op
--    (the WHERE status='pending' guard means the second call finds no
--    row and credits nothing). That is what makes a retry safe.
--
--    Returns the new user balance, or NULL if the commission was not
--    found / not pending / the caller is not allowed to settle.
-- ============================================================
create or replace function public.settle_commission(
  p_commission_id uuid
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
  declare
    v_comm public.commissions%rowtype;
    v_balance numeric;
  begin
    -- Permission check — admin only. has_admin_permission() is
    -- SECURITY DEFINER + STABLE, safe to call here.
    if not public.has_admin_permission('comm', 'update')
       and not public.has_admin_permission('comm', 'payout')
    then
      raise exception 'not permitted to settle commissions';
    end if;

    -- Lock the commission row. FOR UPDATE + the status guard make
    -- concurrent double-settle impossible.
    select * into v_comm
    from public.commissions
    where id = p_commission_id and status = 'pending'
    for update;

    if not found then
      return null;   -- already settled, or unknown id
    end if;

    -- Lock the user row and credit the balance.
    select balance into v_balance
    from public.users
    where id = v_comm.user_id
    for update;

    if not found then
      raise exception 'commission user % no longer exists', v_comm.user_id;
    end if;

    update public.users
    set balance = balance + v_comm.amount,
        updated_at = now()
    where id = v_comm.user_id;

    update public.commissions
    set status = 'settled'
    where id = p_commission_id;

    -- Audit trail.
    perform public.log_admin_action(
      'commission.settle',
      'commissions',
      p_commission_id::text,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'settled', 'amount', v_comm.amount)
    );

    return v_balance + v_comm.amount;
  end;
end;
$$;

-- ============================================================
-- 3. mark_withdrawal_paid(p_withdrawal_id) — mark paid + debit balance
--
--    Same idempotency contract: only a row in 'approved' can be paid,
--    so a retry finds nothing and moves no money.
-- ============================================================
create or replace function public.mark_withdrawal_paid(
  p_withdrawal_id uuid
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
  declare
    v_wd public.withdrawals%rowtype;
    v_balance numeric;
  begin
    if not public.has_admin_permission('wd', 'payout')
       and not public.has_admin_permission('wd', 'update')
    then
      raise exception 'not permitted to mark withdrawals paid';
    end if;

    select * into v_wd
    from public.withdrawals
    where id = p_withdrawal_id and status = 'approved'
    for update;

    if not found then
      return null;
    end if;

    select balance into v_balance
    from public.users
    where id = v_wd.user_id
    for update;

    if not found then
      raise exception 'withdrawal user % no longer exists', v_wd.user_id;
    end if;

    -- The amount is debited net of the fee: the user asked to receive
    -- `amount - fee` but the reservation covered `amount`. Guard
    -- against over-drawing so the balance can never go negative.
    if v_balance < v_wd.amount then
      raise exception 'insufficient balance: have %, need %', v_balance, v_wd.amount;
    end if;

    update public.users
    set balance = balance - v_wd.amount,
        updated_at = now()
    where id = v_wd.user_id;

    update public.withdrawals
    set status = 'paid',
        paid_at = now(),
        updated_at = now()
    where id = p_withdrawal_id;

    perform public.log_admin_action(
      'withdrawal.paid',
      'withdrawals',
      p_withdrawal_id::text,
      jsonb_build_object('status', 'approved'),
      jsonb_build_object('status', 'paid', 'amount', v_wd.amount, 'fee', v_wd.fee)
    );

    return v_balance - v_wd.amount;
  end;
end;
$$;

-- ============================================================
-- 4. Grant execute to authenticated users (the functions do their own
--    permission check inside, using auth.uid()).
-- ============================================================
grant execute on function public.settle_commission(uuid) to authenticated;
grant execute on function public.mark_withdrawal_paid(uuid) to authenticated;
