/**
 * admin-wd-api — admin withdrawal queue (Phase 1.1.8).
 *
 * Phase 1.1.9 — id is now the Supabase uuid (was: numeric hash).
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminWd, type AdminId, type WdStatus } from '../admin/fixtures';

interface JoinedWd {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  method: 'usdt_trc20' | 'card';
  status: WdStatus;
  reject_reason: string | null;
  bound_address: string | null;
  account: string | null;
  created_at: string;
  updated_at: string;
  users: { nickname: string | null; email: string } | null;
}

function mapJoined(r: JoinedWd): AdminWd {
  return {
    id: r.id,
    username: r.users?.email?.split('@')[0] ?? r.user_id.slice(0, 8),
    amount: Number(r.amount),
    fee: Number(r.fee),
    method: r.method,
    status: r.status,
    reject_reason: r.reject_reason ?? undefined,
    bound_address: r.bound_address ?? undefined,
    account: r.account ?? undefined,
    created_at: r.created_at.slice(0, 19),
    uuid: r.id,
  };
}

/** Fetch all withdrawals for the admin. */
export async function fetchAllWd(): Promise<AdminWd[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('withdrawals')
    .select(`
      id, user_id, amount, fee, method, status, reject_reason, bound_address,
      account, created_at, updated_at,
      users:user_id ( nickname, email )
    `)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-wd-api] fetchAllWd:', error);
    return null;
  }
  return ((data ?? []) as unknown as JoinedWd[]).map((r) => mapJoined(r));
}

/**
 * Mark a withdrawal as paid — debit the user's balance.
 *
 * Phase 1.4 change: this used to be a plain `update withdrawals set
 * status='paid'`. The confirm modal told the admin "此操作会从用户余额中
 * 扣除提现金额" but no balance was ever touched — and public.users had
 * no `balance` column at all (admin-users-api.ts hardcoded 0).
 *
 * Now it goes through the `mark_withdrawal_paid(uuid)` RPC
 * (migration 0014): one transaction, row locks, and a guard that
 * refuses to over-draw. The RPC only acts on rows still in 'approved',
 * so a retry cannot double-debit.
 */
export async function setWdPaid(id: AdminId): Promise<WdPayResult> {
  const all = adminStore.wd.read();
  adminStore.wd.write(
    all.map((w) => (w.id === id ? { ...w, status: 'paid' as const } : w)),
  );

  const sb = getSupabase();
  if (!sb) return { ok: true, balanceDebited: false };

  const { error } = await sb.rpc('mark_withdrawal_paid', {
    p_withdrawal_id: id,
  });
  if (!error) return { ok: true, balanceDebited: true };

  // RPC missing (migration 0014 not applied) — fall back to the plain
  // status update so the flow still completes, but no money moved.
  // eslint-disable-next-line no-console
  console.error('[admin-wd-api] mark_withdrawal_paid:', error);

  const { error: updErr } = await sb
    .from('withdrawals')
    .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (updErr) {
    // eslint-disable-next-line no-console
    console.error('[admin-wd-api] setWdPaid:', updErr);
    return { ok: false, balanceDebited: false };
  }
  return { ok: true, balanceDebited: false };
}

/**
 * Result of a withdrawal payout.
 *
 * `balanceDebited` is false when the mark_withdrawal_paid() RPC was
 * unavailable (migration 0014 not applied) and we fell back to a plain
 * status update. The UI uses it to warn that no money moved.
 */
export interface WdPayResult {
  ok: boolean;
  balanceDebited: boolean;
}

/**
 * Update withdrawal status (approve / reject).
 *
 * NOTE: 'paid' is deliberately NOT handled here — marking a withdrawal
 * paid must go through setWdPaid() so the user's balance is debited in
 * the same transaction. Routing 'paid' through this function would
 * silently skip the money movement.
 */
export async function setWdStatus(
  id: AdminId,
  status: WdStatus,
  rejectReason?: string,
): Promise<boolean> {
  const all = adminStore.wd.read();
  const next = all.map((w) =>
    w.id === id
      ? { ...w, status, ...(rejectReason ? { reject_reason: rejectReason } : {}) }
      : w,
  );
  adminStore.wd.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'rejected' && rejectReason) {
    patch.reject_reason = rejectReason;
  }
  const { error } = await sb.from('withdrawals').update(patch).eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-wd-api] setWdStatus:', error);
    return false;
  }
  return true;
}