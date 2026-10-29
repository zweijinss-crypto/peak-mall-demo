/**
 * admin-users-api — admin-side users CRUD (Supabase).
 *
 * Reads public.users (which is 1:1 with auth.users) and maps to
 * AdminUser. Falls back to adminStore.users when Supabase isn't
 * configured.
 *
 * Phase 1.1.9 — id is now the Supabase uuid (was: numeric hash).
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminUser, type AdminId, type UserStatus } from '../admin/fixtures';

interface RemoteUser {
  id: string;
  email: string;
  nickname: string | null;
  role: string;
  status: string;
  invite_code: string | null;
  created_at: string;
  /** Phase 1.4 — added by migration 0014. Optional because the column
   *  does not exist until that migration is applied; a missing column
   *  makes the whole select() fail, so we degrade gracefully. */
  balance?: number | null;
}

function mapJoined(r: RemoteUser): AdminUser {
  const role = r.role === 'agent' ? 'agent' : 'fx';
  const status: UserStatus = r.status === 'frozen' ? 'frozen' : 'active';
  return {
    id: r.id,
    nickname: r.nickname ?? r.email.split('@')[0],
    username: r.email.split('@')[0],
    role,
    referrer: '—',
    teamCount: 0,
    status,
    created_at: r.created_at.slice(0, 10),
    // Phase 1.4 — was hardcoded 0, which made every user's "available
    // balance" show $0.00 in the admin console.
    balance: Number(r.balance ?? 0),
    uuid: r.id,
  };
}

/**
 * Fetch all users for the admin (phase 1.1.8).
 *
 * Phase 1.4 — selects `balance` too. If the column does not exist yet
 * (migration 0014 not applied), PostgREST rejects the whole select
 * with a 42703 error, so we retry without it.
 */
export async function fetchAllUsers(): Promise<AdminUser[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const withBalance = 'id, email, nickname, role, status, invite_code, created_at, balance';
  const withoutBalance = 'id, email, nickname, role, status, invite_code, created_at';

  let data: unknown = null;
  {
    const res = await sb
      .from('users')
      .select(withBalance)
      .order('created_at', { ascending: false })
      .limit(500);
    data = res.data;
    if (res.error) {
      // Missing `balance` column — migration 0014 not applied yet.
      const retry = await sb
        .from('users')
        .select(withoutBalance)
        .order('created_at', { ascending: false })
        .limit(500);
      if (retry.error) {
        // eslint-disable-next-line no-console
        console.error('[admin-users-api] fetchAllUsers:', retry.error);
        return null;
      }
      data = retry.data;
    }
  }
  return ((data ?? []) as unknown as RemoteUser[]).map((r) => mapJoined(r));
}

/** Toggle user active/frozen. */
export async function setUserStatus(
  id: AdminId,
  status: UserStatus,
): Promise<boolean> {
  const all = adminStore.users.read();
  const next = all.map((u) => (u.id === id ? { ...u, status } : u));
  adminStore.users.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-users-api] setUserStatus:', error);
    return false;
  }
  return true;
}