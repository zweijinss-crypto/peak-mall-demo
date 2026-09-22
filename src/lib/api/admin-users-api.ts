/**
 * admin-users-api — admin-side user mgmt (Supabase, is_admin RLS).
 */

import { getSupabase } from './supabase-client';

export interface AdminUserRow {
  id: string;
  email: string;
  nickname: string | null;
  role: 'user' | 'admin' | 'fx' | 'agent';
  status: 'active' | 'frozen';
  locale: string;
  currency: string;
  invite_code: string | null;
  created_at: string;
}

export async function fetchAllUsers(): Promise<AdminUserRow[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-users-api] fetchAllUsers:', error);
    return null;
  }
  return (data ?? []) as AdminUserRow[];
}

export async function setUserStatus(
  userId: string,
  status: 'active' | 'frozen',
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from('users').update({ status }).eq('id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-users-api] setUserStatus:', error);
    return false;
  }
  return true;
}

export async function setUserRole(
  userId: string,
  role: 'user' | 'admin' | 'fx' | 'agent',
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from('users').update({ role }).eq('id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-users-api] setUserRole:', error);
    return false;
  }
  return true;
}
