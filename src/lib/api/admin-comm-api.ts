/**
 * admin-comm-api — admin commission ledger (Phase 1.1.8).
 *
 * Reads public.commissions + users joined. Falls back to
 * adminStore.comm when Supabase isn't configured.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminCommLog } from '../admin/fixtures';

interface RemoteComm {
  id: string;
  user_id: string;
  order_no: string;
  amount: number;
  rate: number;
  status: 'settled' | 'pending';
  created_at: string;
}

interface JoinedComm extends RemoteComm {
  users: { nickname: string | null; email: string } | null;
}

function mapJoined(r: JoinedComm, i: number): AdminCommLog {
  return {
    id: hashId(r.id, i),
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
  return ((data ?? []) as unknown as JoinedComm[]).map(mapJoined);
}

function hashId(uuid: string, fallback: number): number {
  let x = 5381 ^ uuid.charCodeAt(0);
  for (let i = 0; i < uuid.length; i++) x = ((x << 5) + x) ^ uuid.charCodeAt(i);
  x = ((x << 5) + x) ^ (fallback & 0xffff);
  return x >>> 0;
}