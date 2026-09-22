/**
 * admin-tickets-api — admin-side tickets / after-sales CRUD (Supabase).
 *
 * Reads from public.after_sales and maps to AdminTicket.
 *
 * Phase 1.1.9 — id is now the Supabase uuid (was: numeric hash).
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminTicket, type AdminId } from '../admin/fixtures';

interface JoinedTicket {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
  orders: { order_no: string } | null;
  users: { email: string; nickname: string | null } | null;
}

function mapJoined(r: JoinedTicket): AdminTicket {
  return {
    id: r.id,
    order_no: r.orders?.order_no ?? r.order_id.slice(0, 8),
    username: r.users?.email ?? r.user_id.slice(0, 8),
    reason: r.reason,
    status: r.status,
    created_at: r.created_at.slice(0, 19),
    uuid: r.id,
  };
}

/** Fetch all tickets for the admin (phase 1.1.8). */
export async function fetchAllTickets(): Promise<AdminTicket[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('after_sales')
    .select(`
      id, order_id, user_id, reason, status, created_at, updated_at,
      orders:order_id ( order_no ),
      users:user_id ( email, nickname )
    `)
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-tickets-api] fetchAllTickets:', error);
    return null;
  }
  return ((data ?? []) as unknown as JoinedTicket[]).map((r) => mapJoined(r));
}

/**
 * Update a ticket's status (admin reply / close). Mirrors to local
 * adminStore so the optimistic UI stays in sync.
 */
export async function setTicketStatus(
  id: AdminId,
  status: 'open' | 'replied' | 'closed',
): Promise<boolean> {
  // 1. Always update the local store first (instant feedback).
  const all = adminStore.tickets.read();
  const next = all.map((t) => (t.id === id ? { ...t, status } : t));
  adminStore.tickets.write(next);

  const sb = getSupabase();
  if (!sb) return true;

  const { error } = await sb
    .from('after_sales')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-tickets-api] setTicketStatus:', error);
    return false;
  }
  return true;
}