/**
 * admin-comm-api — admin commission ledger (Phase 1.1.8).
 *
 * Phase 1.1.9 — id is now the Supabase uuid (was: numeric hash).
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminCommLog } from '../admin/fixtures';

interface JoinedComm {
  id: string;
  user_id: string;
  order_no: string;
  amount: number;
  rate: number;
  status: 'settled' | 'pending';
  created_at: string;
  users: { nickname: string | null; email: string } | null;
}

function mapJoined(r: JoinedComm): AdminCommLog {
  return {
    id: r.id,
    username: r.users?.email?.split('@')[0] ?? r.user_id.slice(0, 8),
    amount: Number(r.amount),
    source: r.order_no,
    rate: Number(r.rate),
    status: r.status,
    created_at: r.created_at.slice(0, 19),
    uuid: r.id,
  };
}

/** Fetch all commission entries for the admin. */
export async function fetchAllComm(): Promise<AdminCommLog[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('commissions')
    .select(`
      id, user_id, order_no, amount, rate, status, created_at,
      users:user_id ( nickname, email )
    `)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-comm-api] fetchAllComm:', error);
    return null;
  }
  return ((data ?? []) as unknown as JoinedComm[]).map((r) => mapJoined(r));
}

/**
 * Update a commission's status (settle a pending entry).
 *
 * IMPORTANT — Phase 1.4 change:
 *   Settling now goes through the `settle_commission(uuid)` RPC
 *   (migration 0014), NOT a plain `update commissions set status`.
 *
 *   The old implementation only flipped the status column. The admin
 *   copy promised "金额 {amount} 将计入该用户的可用余额" but no
 *   balance was ever credited — and public.users had no `balance`
 *   column at all, so the "available balance" was hardcoded 0.
 *
 *   The RPC does the status flip AND the balance credit inside one
 *   transaction with a row lock, so:
 *     - a failed credit can never leave a settled-but-unpaid commission
 *     - a double-click (or a retry after a network blip) cannot
 *       double-pay: the RPC only acts on rows still in 'pending'
 *
 * Falls back to the plain status update when the RPC is unavailable
 * (migration not applied yet) so the page still works, but then the
 * balance is NOT credited — `settleCreditApplied` reports that.
 */
export async function setCommStatus(
  id: AdminCommLog['id'],
  status: 'settled' | 'pending',
): Promise<CommSettleResult> {
  // 1. Local store first (instant feedback).
  const all = adminStore.comm.read();
  adminStore.comm.write(
    all.map((c) => (c.id === id ? { ...c, status } : c)),
  );

  const sb = getSupabase();
  if (!sb) return { ok: true, balanceCredited: false };

  // Settling is the only direction that moves money.
  if (status === 'settled') {
    const { error } = await sb.rpc('settle_commission', {
      p_commission_id: id,
    });
    if (!error) {
      return { ok: true, balanceCredited: true };
    }
    // RPC missing (migration 0014 not applied) or the function raised.
    // Log it and fall through to the plain update so the status still
    // flips — but the balance stays uncredited, and we say so.
    // eslint-disable-next-line no-console
    console.error('[admin-comm-api] settle_commission:', error);
  }

  const { error } = await sb
    .from('commissions')
    .update({ status })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-comm-api] setCommStatus:', error);
    return { ok: false, balanceCredited: false };
  }
  return { ok: true, balanceCredited: false };
}

/**
 * Result of a commission status change.
 *
 * `balanceCredited` is false when the settle_commission() RPC was
 * unavailable (migration 0014 not applied) and we fell back to a plain
 * status update. The UI uses it to warn that no money moved.
 */
export interface CommSettleResult {
  ok: boolean;
  balanceCredited: boolean;
}