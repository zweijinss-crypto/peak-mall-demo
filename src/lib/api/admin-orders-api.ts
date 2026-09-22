/**
 * admin-orders-api — admin-side orders CRUD (Supabase).
 *
 * Reads from public.orders + public.users joined. Maps to the
 * AdminOrder shape the admin UI expects. Falls back to localStorage
 * adminStore.orders when Supabase isn't configured.
 *
 * Mutators (setOrderStatus / shipOrder / refundOrder) all read the
 * stored numeric id → uuid map written by fetchAllOrders, so the
 * admin UI can keep using its synthetic hash-based ids without
 * needing a schema migration of the local ids.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminOrder, type OrderStatus } from '../admin/fixtures';

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

function mapJoined(r: JoinedOrder, i: number): AdminOrder {
  return {
    id: hashId(r.id, i),
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

function hashId(uuid: string, fallback: number): number {
  let x = 5381 ^ uuid.charCodeAt(0);
  for (let i = 0; i < uuid.length; i++) x = ((x << 5) + x) ^ uuid.charCodeAt(i);
  x = ((x << 5) + x) ^ (fallback & 0xffff);
  return x >>> 0;
}

/** Resolve the synthetic numeric id back to the Supabase uuid. */
function findUuid(numericId: number): string | null {
  const order = adminStore.orders.read().find((o) => o.id === numericId);
  return order?.uuid ?? null;
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
  return ((data ?? []) as unknown as JoinedOrder[]).map(mapJoined);
}

/** Update order status (admin action). */
export async function setOrderStatus(
  numericId: number,
  status: OrderStatus,
  extra?: { carrier?: string; tracking_no?: string; cancel_reason?: string },
): Promise<boolean> {
  const all = adminStore.orders.read();
  const now = new Date().toISOString();
  const next = all.map((o) => (o.id === numericId ? { ...o, status, updated_at: now.slice(0, 19) } : o));
  adminStore.orders.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const uuid = findUuid(numericId);
  if (!uuid) return true;

  const patch: Record<string, unknown> = { status, updated_at: now };
  if (extra?.carrier) patch.carrier = extra.carrier;
  if (extra?.tracking_no) patch.tracking_no = extra.tracking_no;
  if (status === 'shipped') patch.shipped_at = now;
  if (status === 'cancelled') {
    patch.cancelled_at = now;
    if (extra?.cancel_reason) patch.cancel_reason = extra.cancel_reason;
  }
  const { error } = await sb.from('orders').update(patch).eq('id', uuid);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] setOrderStatus:', error);
    return false;
  }
  return true;
}

/** Phase 2.2 — persist carrier + tracking_no + mark shipped. */
export async function shipOrder(
  numericId: number,
  carrier: string,
  trackingNo: string,
): Promise<boolean> {
  const all = adminStore.orders.read();
  const now = new Date().toISOString();
  const next = all.map((o) =>
    o.id === numericId
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
  const uuid = findUuid(numericId);
  if (!uuid) return true;
  const { error } = await sb
    .from('orders')
    .update({
      status: 'shipped',
      carrier,
      tracking_no: trackingNo,
      shipped_at: now,
      updated_at: now,
    })
    .eq('id', uuid);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] shipOrder:', error);
    return false;
  }
  return true;
}

/** Phase 2.2 — admin marks order as completed (after delivery). */
export async function completeOrder(numericId: number): Promise<boolean> {
  return setOrderStatus(numericId, 'completed');
}

/** Phase 2.2 — admin cancels an order with a reason. */
export async function adminCancelOrder(
  numericId: number,
  reason: string,
): Promise<boolean> {
  return setOrderStatus(numericId, 'cancelled', { cancel_reason: reason });
}

export interface RefundResult {
  ok: boolean;
  error?: string;
}

/**
 * Phase 2.4 — partial or full refund.
 *
 * - Updates orders.refund_state / refund_amount / payment_status / status.
 * - Logs into order_refunds (when the table exists).
 * - Returns {ok, error} so the admin modal can show server-side errors.
 */
export async function refundOrder(
  numericId: number,
  amount: number,
  reason: string,
): Promise<RefundResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be positive.' };
  }
  const all = adminStore.orders.read();
  const target = all.find((o) => o.id === numericId);
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
    o.id === numericId
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
  const uuid = target.uuid;
  if (!uuid) return { ok: true };

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
  const { error: updateErr } = await sb.from('orders').update(patch).eq('id', uuid);
  if (updateErr) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders-api] refundOrder update:', updateErr);
    return { ok: false, error: updateErr.message };
  }

  // 2. Append to order_refunds (best-effort, ignore if table missing).
  try {
    const { error: refundErr } = await sb.from('order_refunds').insert({
      order_id: uuid,
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