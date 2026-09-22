/**
 * admin-orders-api — admin-side orders CRUD (Supabase).
 *
 * Reads from public.orders + public.users joined. Maps to the
 * AdminOrder shape the admin UI expects. Falls back to localStorage
 * adminStore.orders when Supabase isn't configured.
 *
 * Phase 1.1.9 — id is now the Supabase uuid (was: numeric hash).
 * Mutators take `id` (string uuid) directly. LocalStore rows carry the
 * same uuid, so no translation layer is needed.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminOrder, type OrderStatus, type AdminId } from '../admin/fixtures';

interface RemoteOrder {
  id: string;                  // uuid
  order_no: string;
  user_id: string;
  total: number;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: string | null;
  paid_at: string | null;
  ship_name: string;
  ship_region: string;
  ship_detail: string;
  carrier: string | null;
  tracking_no: string | null;
  shipped_at: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface JoinedOrder extends RemoteOrder {
  users: { nickname: string | null; email: string } | null;
}

function mapJoined(r: JoinedOrder): AdminOrder {
  return {
    id: r.id,
    order_no: r.order_no,
    nickname: r.users?.nickname ?? r.ship_name,
    username: r.users?.email ?? r.user_id.slice(0, 8),
    amount: Number(r.total),
    status: r.status,
    pay_method: r.payment_method ?? undefined,
    buyer_email: r.users?.email ?? undefined,
    address: `${r.ship_region} ${r.ship_detail}`.trim(),
    contact_name: r.ship_name,
    cancel_reason: r.cancel_reason ?? undefined,
    created_at: r.created_at.slice(0, 19),
    updated_at: r.updated_at.slice(0, 19),
    uuid: r.id,
  };
}

/** Fetch all orders for the admin (phase 1.1.8). */
export async function fetchAllOrders(): Promise<AdminOrder[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('orders')
    .select(`
      id, order_no, user_id, total, status, payment_method, payment_status,
      paid_at, ship_name, ship_region, ship_detail, carrier, tracking_no,
      shipped_at, cancel_reason, cancelled_at, created_at, updated_at,
      users:user_id ( nickname, email )
    `)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] fetchAllOrders:', error);
    return null;
  }
  return ((data ?? []) as unknown as JoinedOrder[]).map((r) => mapJoined(r));
}

/** Update order status (admin action). */
export async function setOrderStatus(
  id: AdminId,
  status: OrderStatus,
  extra?: { carrier?: string; tracking_no?: string; cancel_reason?: string },
): Promise<boolean> {
  const all = adminStore.orders.read();
  const now = new Date().toISOString();
  const next = all.map((o) => (o.id === id ? { ...o, status, updated_at: now.slice(0, 19) } : o));
  adminStore.orders.write(next);

  const sb = getSupabase();
  if (!sb) return true;

  const patch: Record<string, unknown> = { status, updated_at: now };
  if (extra?.carrier) patch.carrier = extra.carrier;
  if (extra?.tracking_no) patch.tracking_no = extra.tracking_no;
  if (status === 'shipped') patch.shipped_at = now;
  if (status === 'cancelled') {
    patch.cancelled_at = now;
    if (extra?.cancel_reason) patch.cancel_reason = extra.cancel_reason;
  }
  const { error } = await sb.from('orders').update(patch).eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] setOrderStatus:', error);
    return false;
  }
  return true;
}

/** Phase 2.2 — persist carrier + tracking_no + mark shipped. */
export async function shipOrder(
  id: AdminId,
  carrier: string,
  trackingNo: string,
): Promise<boolean> {
  const all = adminStore.orders.read();
  const now = new Date().toISOString();
  const next = all.map((o) =>
    o.id === id
      ? {
          ...o,
          status: 'shipped' as const,
          carrier,
          tracking_no: trackingNo,
          shipped_at: now.slice(0, 19),
          updated_at: now.slice(0, 19),
        }
      : o,
  );
  adminStore.orders.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb
    .from('orders')
    .update({
      status: 'shipped',
      carrier,
      tracking_no: trackingNo,
      shipped_at: now,
      updated_at: now,
    })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] shipOrder:', error);
    return false;
  }
  return true;
}

/** Phase 2.2 — admin marks order as completed (after delivery). */
export async function completeOrder(id: AdminId): Promise<boolean> {
  return setOrderStatus(id, 'completed');
}

/** Phase 2.2 — admin cancels an order with a reason. */
export async function adminCancelOrder(
  id: AdminId,
  reason: string,
): Promise<boolean> {
  return setOrderStatus(id, 'cancelled', { cancel_reason: reason });
}

export interface RefundResult {
  ok: boolean;
  error?: string;
}

/**
 * Phase 2.4 — partial or full refund.
 */
export async function refundOrder(
  id: AdminId,
  amount: number,
  reason: string,
): Promise<RefundResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be positive.' };
  }
  const all = adminStore.orders.read();
  const target = all.find((o) => o.id === id);
  if (!target) return { ok: false, error: 'Order not found.' };

  const orderTotal = Number(target.amount);
  const alreadyRefunded = Number(target.refund_amount ?? 0);
  const remaining = orderTotal - alreadyRefunded;
  if (amount > remaining + 0.005) {
    return { ok: false, error: `Maximum refundable is $${remaining.toFixed(2)}.` };
  }
  const newRefundedTotal = alreadyRefunded + amount;
  const isFull = newRefundedTotal >= orderTotal - 0.005;
  const now = new Date().toISOString();

  // Optimistic local update.
  const next = all.map((o) =>
    o.id === id
      ? {
          ...o,
          refunded: true,
          refund_at: isFull ? now.slice(0, 19) : o.refund_at,
          refund_amount: newRefundedTotal,
          refund_state: isFull ? ('full' as const) : ('partial' as const),
          status: isFull ? ('cancelled' as const) : o.status,
          payment_status: isFull ? ('refunded' as const) : o.payment_status,
          updated_at: now.slice(0, 19),
        }
      : o,
  );
  adminStore.orders.write(next);

  const sb = getSupabase();
  if (!sb) return { ok: true };

  // 1. Update orders header.
  const patch: Record<string, unknown> = {
    refund_amount: newRefundedTotal,
    refund_state: isFull ? 'full' : 'partial',
    updated_at: now,
  };
  if (isFull) {
    patch.status = 'cancelled';
    patch.payment_status = 'refunded';
    patch.cancelled_at = now;
    patch.cancel_reason = reason;
  }
  const { error: updateErr } = await sb.from('orders').update(patch).eq('id', id);
  if (updateErr) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] refundOrder update:', updateErr);
    return { ok: false, error: updateErr.message };
  }

  // 2. Append to order_refunds (best-effort, ignore if table missing).
  try {
    const { error: refundErr } = await sb.from('order_refunds').insert({
      order_id: id,
      amount,
      reason,
      status: isFull ? 'refunded' : 'pending',
    });
    if (refundErr) {
      // eslint-disable-next-line no-console
      console.warn('[admin-orders-api] refundOrder order_refunds insert:', refundErr);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[admin-orders-api] refundOrder order_refunds throw:', e);
  }

  return { ok: true };
}