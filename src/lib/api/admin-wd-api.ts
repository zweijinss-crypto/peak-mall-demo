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

/** Update withdrawal status (approve / reject / mark paid). */
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