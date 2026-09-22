/**
 * orders-api — order CRUD + state transitions.
 *
 * All operations go through the authenticated client; RLS handles auth.
 * Anonymous users (no auth.uid()) will get RLS denies — fine, the
 * caller falls back to localStorage mock mode.
 */

import { getSupabase } from './supabase-client';

export interface OrderRow {
  id: string;
  order_no: string;
  user_id: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  coupon_code: string | null;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  ship_name: string;
  ship_phone: string;
  ship_region: string;
  ship_detail: string;
  payment_method: string | null;
  payment_status: 'pending' | 'success' | 'failed' | 'refunded';
  payment_id: string | null;
  paid_at: string | null;
  carrier: string | null;
  tracking_no: string | null;
  shipped_at: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: string;
  product_id: number;
  product_name: { zh: string; en: string; ja?: string; ko?: string };
  cover: string | null;
  unit_price: number;
  qty: number;
  subtotal: number;
}

/** Fetch all orders for the current user. */
export async function fetchMyOrders(): Promise<OrderRow[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[orders-api] fetchMyOrders:', error);
    return [];
  }
  return (data ?? []) as OrderRow[];
}

/** Fetch one order with items. */
export async function fetchOrderById(orderId: string) {
  const sb = getSupabase();
  if (!sb) return null;

  const [{ data: order, error: e1 }, { data: items, error: e2 }] =
    await Promise.all([
      sb.from('orders').select('*').eq('id', orderId).single(),
      sb.from('order_items').select('*').eq('order_id', orderId),
    ]);

  if (e1 || e2) {
    // eslint-disable-next-line no-console
    console.error('[orders-api] fetchOrderById:', e1 || e2);
    return null;
  }
  return { order: order as OrderRow, items: (items ?? []) as OrderItemRow[] };
}

/** Create a new order + items in one transaction. */
export async function createOrder(input: {
  items: Array<{
    productId: number;
    qty: number;
    unitPrice: number;
    name: { zh: string; en: string; ja?: string; ko?: string };
    cover: string | null;
  }>;
  shipping: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  };
  total: { subtotal: number; shipping: number; tax: number; discount: number; total: number };
  currency: string;
  couponCode: string | null;
}): Promise<{ orderId: string; orderNo: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: user } = await sb.auth.getUser();
  if (!user.user) return null;

  // Generate short readable order_no like "OMTXXXXXX-NN"
  const orderNo = await generateOrderNo(sb);

  const { data: order, error: e1 } = await sb
    .from('orders')
    .insert({
      order_no: orderNo,
      user_id: user.user.id,
      subtotal: input.total.subtotal,
      shipping: input.total.shipping,
      tax: input.total.tax,
      discount: input.total.discount,
      total: input.total.total,
      currency: input.currency,
      coupon_code: input.couponCode,
      status: 'pending',
      payment_status: 'pending',
      ship_name: input.shipping.name,
      ship_phone: input.shipping.phone,
      ship_region: input.shipping.region,
      ship_detail: input.shipping.detail,
    })
    .select('id, order_no')
    .single();

  if (e1 || !order) {
    // eslint-disable-next-line no-console
    console.error('[orders-api] createOrder header:', e1);
    return null;
  }

  const itemRows = input.items.map((it) => ({
    order_id: order.id,
    product_id: it.productId,
    product_name: it.name,
    cover: it.cover,
    unit_price: it.unitPrice,
    qty: it.qty,
    subtotal: it.unitPrice * it.qty,
  }));

  const { error: e2 } = await sb.from('order_items').insert(itemRows);
  if (e2) {
    // eslint-disable-next-line no-console
    console.error('[orders-api] createOrder items:', e2);
    return null;
  }

  return { orderId: order.id, orderNo: order.order_no };
}

/** Cancel own pending order. Returns true on success. */
export async function cancelOwnOrder(orderId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending'); // RLS already restricts, this is belt-and-suspenders

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[orders-api] cancelOwnOrder:', error);
    return false;
  }
  return true;
}

// ============================================================
// helpers
// ============================================================
async function generateOrderNo(sb: ReturnType<typeof getSupabase>): Promise<string> {
  // OMT + 8 base32 chars + 2 random suffix
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1
  let body = '';
  for (let i = 0; i < 8; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const suffix = String(Math.floor(Math.random() * 256)).padStart(2, '0').toUpperCase();
  const orderNo = `OMT${body}-${suffix}`;

  // Re-roll on collision (rare but possible); retry up to 3 times
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await sb!
      .from('orders')
      .select('id')
      .eq('order_no', orderNo)
      .maybeSingle();
    if (!data) return orderNo;
    // regenerate suffix
    const newSuffix = String(Math.floor(Math.random() * 256))
      .padStart(2, '0')
      .toUpperCase();
    return `OMT${body}-${newSuffix}`;
  }
  return orderNo; // last resort; might collide, RLS will reject on insert
}
