/**
 * admin-invite-api — admin invite code CRUD (Phase 1.1.8).
 *
 * Reads public.invite_codes. Falls back to adminStore.invites.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminInvite } from '../admin/fixtures';

interface RemoteInvite {
  code: string;
  used: number;
  usage_limit: number | null;
  status: 'active' | 'disabled';
  created_at: string;
}

function mapJoined(r: RemoteInvite): AdminInvite {
  return {
    code: r.code,
    used: r.used,
    limit: r.usage_limit ?? 0,
    created_at: r.created_at.slice(0, 10),
    status: r.status,
  };
}

/** Fetch all invite codes. */
export async function fetchAllInvites(): Promise<AdminInvite[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('invite_codes')
    .select('code, used, usage_limit, status, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-invite-api] fetchAllInvites:', error);
    return null;
  }
  return ((data ?? []) as unknown as RemoteInvite[]).map(mapJoined);
}

/** Insert a new invite code. */
export async function addInvite(code: string, limit: number): Promise<boolean> {
  const all = adminStore.invites.read();
  const now = new Date().toISOString().slice(0, 10);
  adminStore.invites.write([
    { code, used: 0, limit, created_at: now, status: 'active' },
    ...all,
  ]);
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb
    .from('invite_codes')
    .insert({ code, used: 0, usage_limit: limit, status: 'active' });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-invite-api] addInvite:', error);
    return false;
  }
  return true;
}

/** Toggle invite status. */
export async function setInviteStatus(code: string, status: 'active' | 'disabled'): Promise<boolean> {
  const all = adminStore.invites.read();
  adminStore.invites.write(all.map((i) => (i.code === code ? { ...i, status } : i)));
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb
    .from('invite_codes')
    .update({ status })
    .eq('code', code);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-invite-api] setInviteStatus:', error);
    return false;
  }
  return true;
}