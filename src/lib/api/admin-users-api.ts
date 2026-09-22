/**
 * admin-users-api — admin-side users CRUD (Supabase).
 *
 * Reads public.users (which is 1:1 with auth.users) and maps to
 * AdminUser. Falls back to adminStore.users when Supabase isn't
 * configured.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminUser, type UserRole, type UserStatus } from '../admin/fixtures';

interface RemoteUser {
  id: string;
  email: string;
  nickname: string | null;
  role: string;
  status: string;
  invite_code: string | null;
  created_at: string;
}

function mapJoined(r: RemoteUser, i: number): AdminUser {
  const role: UserRole = r.role === 'agent' ? 'agent' : 'fx';
  const status: UserStatus = r.status === 'frozen' ? 'frozen' : 'active';
  return {
    id: hashId(r.id, i),
    nickname: r.nickname ?? r.email.split('@')[0],
    username: r.email.split('@')[0],
    role,
    referrer: '—',
    teamCount: 0,
    status,
    created_at: r.created_at.slice(0, 10),
    balance: 0,
    uuid: r.id,
  };
}

/** Fetch all users for the admin (phase 1.1.8). */
export async function fetchAllUsers(): Promise<AdminUser[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('users')
    .select('id, email, nickname, role, status, invite_code, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-users-api] fetchAllUsers:', error);
    return null;
  }
  return ((data ?? []) as unknown as RemoteUser[]).map(mapJoined);
}

/** Toggle user active/frozen. */
export async function setUserStatus(
  numericId: number,
  status: UserStatus,
): Promise<boolean> {
  const all = adminStore.users.read();
  const next = all.map((u) => (u.id === numericId ? { ...u, status } : u));
  adminStore.users.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const user = all.find((u) => u.id === numericId);
  const uuid = user?.uuid;
  if (!uuid) return true;
  const { error } = await sb
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', uuid);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-users-api] setUserStatus:', error);
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