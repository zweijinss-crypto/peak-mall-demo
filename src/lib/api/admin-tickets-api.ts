/**
 * admin-tickets-api — admin-side tickets / after-sales CRUD (Supabase).
 *
 * Reads from public.after_sales (canonical) and exposes the simple
 * fields the admin UI expects: id, order_no, username, reason, status,
 * created_at. Updates go back to public.after_sales; status is the
 * after_sales.status enum ('open' / 'replied' / 'closed').
 *
 * Falls back to localStorage adminStore.tickets when Supabase isn't
 * configured — the static demo keeps its seed.
 *
 * Side-effect contract: every mutator (setTicketStatus) ALSO mirrors
 * the change into the local adminStore so the page state stays in
 * sync immediately (optimistic UI).
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminTicket } from '../admin/fixtures';

interface RemoteTicket {
  id: string;                       // uuid
  order_id: string;                 // uuid → admin UI shows as order_no via join
  user_id: string;                  // uuid
  reason: string;
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
}

interface JoinedTicket extends RemoteTicket {
  orders: { order_no: string } | null;
  users: { email: string; nickname: string | null } | null;
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
  return ((data ?? []) as unknown as JoinedTicket[]).map((r, i) => ({
    // Synthetic numeric id for the admin UI; collisions across pages
    // are extremely unlikely for typical catalog size.
    id: hashId(r.id, i),
    order_no: r.orders?.order_no ?? r.order_id.slice(0, 8),
    username: r.users?.email ?? r.user_id.slice(0, 8),
    reason: r.reason,
    status: r.status,
    created_at: r.created_at.slice(0, 19),
    uuid: r.id,
  }));
}

/**
 * Update a ticket's status (admin reply / close). Mirrors to local
 * adminStore so the optimistic UI stays in sync.
 *
 * Returns true on success (or when Supabase isn't configured — the
 * local store always gets the change).
 */
export async function setTicketStatus(
  numericId: number,
  status: 'open' | 'replied' | 'closed',
): Promise<boolean> {
  // 1. Always update the local store first (instant feedback).
  const all = adminStore.tickets.read();
  const next = all.map((t) => (t.id === numericId ? { ...t, status } : t));
  adminStore.tickets.write(next);

  // 2. Pull the uuid that fetchAllTickets stashed on the row.
  const sb = getSupabase();
  if (!sb) return true;
  const ticket = all.find((t) => t.id === numericId);
  const uuid = ticket?.uuid;
  if (!uuid) {
    // Row came from localStorage seed (no uuid). Nothing to push.
    return true;
  }

  const { error } = await sb
    .from('after_sales')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', uuid);
  if (error) {
    console.error('[admin-tickets-api] setTicketStatus:', error);
    return false;
  }
  return true;
}

/**
 * Hash a uuid + index into a positive 32-bit integer.
 * Stable across runs but unique per row.
 */
function hashId(uuid: string, fallback: number): number {
  let x = 5381 ^ uuid.charCodeAt(0);
  for (let i = 0; i < uuid.length; i++) x = ((x << 5) + x) ^ uuid.charCodeAt(i);
  // Mix in the index so two tickets sharing a hash byte still differ.
  x = ((x << 5) + x) ^ (fallback & 0xffff);
  return x >>> 0;
}

/**
 * Reverse-map a numeric admin id back to its uuid, given the current
 * list. Required because setTicketStatus needs the uuid but the admin
 * UI passes the numeric id.
 */
export function findTicketUuid(
  numericId: number,
  allTickets: AdminTicket[],
  joinedRows: JoinedTicket[],
): string | null {
  const ticket = allTickets.find((t) => t.id === numericId);
  if (!ticket) return null;
  // The hash we emit is `hashId(joined.id, i)`. Reverse it by index.
  const idx = allTickets.indexOf(ticket);
  return joinedRows[idx]?.id ?? null;
}