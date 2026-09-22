/**
 * admin-wd-api — admin withdrawal queue (Phase 1.1.8).
 *
 * Reads public.withdrawals + users. Falls back to adminStore.wd.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminWd, type WdStatus } from '../admin/fixtures';

interface RemoteWd {
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
}

interface JoinedWd extends RemoteWd {
  users: { nickname: string | null; email: string } | null;
}

function mapJoined(r: JoinedWd, i: number): AdminWd {
  return {
    id: hashId(r.id, i),
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

function findUuid(numericId: number): string | null {
  return adminStore.wd.read().find((w) => w.id === numericId)?.uuid ?? null;
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
  return ((data ?? []) as unknown as JoinedWd[]).map(mapJoined);
}

/** Update withdrawal status (approve / reject / mark paid). */
export async function setWdStatus(
  numericId: number,
  status: WdStatus,
  rejectReason?: string,
): Promise<boolean> {
  const all = adminStore.wd.read();
  const next = all.map((w) =>
    w.id === numericId
      ? { ...w, status, ...(rejectReason ? { reject_reason: rejectReason } : {}) }
      : w,
  );
  adminStore.wd.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const uuid = findUuid(numericId);
  if (!uuid) return true;
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'rejected' && rejectReason) {
    patch.reject_reason = rejectReason;
  }
  const { error } = await sb.from('withdrawals').update(patch).eq('id', uuid);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-wd-api] setWdStatus:', error);
    return false;
  }
  return true;
}

function hashId(uuid: string, fallback: number): number {
  let x = 5381 ^ uuid.charCodeAt(0);
  for (let i = 0; i < uuid.length; i++) x = ((x << 5) + x) ^ uuid.charCodeAt(i);
  x = ((x << 5) + x) ^ (fallback & 0xffff);
  return x >>> 0;
}