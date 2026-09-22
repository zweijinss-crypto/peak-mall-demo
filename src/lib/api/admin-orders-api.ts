/**
 * admin-orders-api — admin-side order ops (Supabase, is_admin RLS).
 *
 * read = fetch all orders (admin view)
 * updateStatus = admin changes order status (ship, complete, cancel)
 */

import { getSupabase } from './supabase-client';
import type { OrderRow } from './orders-api';

export interface AdminOrderRow extends OrderRow {
  user_email: string;
  item_count: number;
}

export async function fetchAllOrdersForAdmin(): Promise<AdminOrderRow[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('order_summary')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] fetchAllOrders:', error);
    return null;
  }
  return (data ?? []) as AdminOrderRow[];
}

/** Mark order as shipped with tracking info. */
export async function shipOrder(
  orderId: string,
  carrier: string,
  trackingNo: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('orders')
    .update({
      status: 'shipped',
      carrier,
      tracking_no: trackingNo,
      shipped_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] shipOrder:', error);
    return false;
  }
  return true;
}

/** Mark order as completed (terminal happy path). */
export async function completeOrder(orderId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', orderId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] completeOrder:', error);
    return false;
  }
  return true;
}

/** Admin cancels an order (any state). */
export async function adminCancelOrder(
  orderId: string,
  reason: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { data: user } = await sb.auth.getUser();
  const { error } = await sb
    .from('orders')
    .update({
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.user?.id ?? null,
    })
    .eq('id', orderId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] adminCancelOrder:', error);
    return false;
  }
  return true;
}
