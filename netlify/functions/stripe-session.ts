/**
 * Netlify Function: stripe-session
 *
 * Creates a Stripe Checkout Session for a given cart and returns the
 * session URL. The client uses `stripe.redirectToCheckout()` to send
 * the user to Stripe's hosted payment page.
 *
 * Endpoint: POST /.netlify/functions/stripe-session
 * Body:     { items: [...], shipping: {...}, currency: 'USD', couponCode: 'SAVE10'|null }
 * Returns:  { url, orderId, orderNo }
 *
 * Failure modes:
 *   503 — Stripe or Supabase env missing
 *   400 — body parse / schema error
 *   402 — order creation failed (RLS / DB issue)
 */

import type { Handler } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getStripeServer } from '../../src/lib/api/stripe-server';

interface LineItem {
  productId: number;
  name: string;
  unitPrice: number; // cents (matches Stripe `unit_amount`)
  qty: number;
  cover: string | null;
}

interface Address {
  name: string;
  phone: string;
  region: string;
  detail: string;
}

interface RequestBody {
  items: LineItem[];
  shipping: Address;
  currency: string;
  couponCode: string | null;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = getStripeServer();
  if (!stripe) return { statusCode: 503, body: 'Stripe not configured' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { statusCode: 503, body: 'Supabase not configured' };
  }
  // Re-use service-role client so orders/orders_items writes bypass RLS.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  if (!body.items?.length || !body.shipping?.name) {
    return { statusCode: 400, body: 'Missing items / shipping' };
  }

  // 1. Create the order row in pending state so the webhook has an id to update.
  // Use the service-role client so we bypass RLS (no user session here).
  const created = await createOrderOnServer(supabase, {
    items: body.items,
    shipping: body.shipping,
    currency: body.currency,
    couponCode: body.couponCode,
  });
  if (!created) return { statusCode: 402, body: 'Order creation failed' };

  // 2. Build the Stripe Checkout Session.
  const origin = event.headers['origin'] ?? event.headers['Origin'] ?? '';
  const successUrl = `${origin}/orders?paid=1&order=${created.orderId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/checkout?cancelled=1`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: body.items.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: body.currency.toLowerCase(),
          unit_amount: it.unitPrice, // already in cents
          product_data: {
            name: it.name,
            images: it.cover?.startsWith('http') ? [it.cover] : [],
          },
        },
      })),
      customer_email: undefined, // collected by Stripe
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_id: created.orderId,
        order_no: created.orderNo,
      },
      shipping_address_collection: { allowed_countries: ['US', 'CN', 'GB', 'DE', 'FR', 'JP', 'KR', 'CA', 'AU'] },
    });

    if (!session.url) {
      return { statusCode: 500, body: 'Stripe returned no url' };
    }

    // Store the session id on the order so the webhook can match later.
    await supabase
      .from('orders')
      .update({ payment_id: session.id })
      .eq('id', created.orderId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
        orderId: created.orderId,
        orderNo: created.orderNo,
      }),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[stripe-session] create failed:', err);
    return { statusCode: 500, body: 'Stripe session create failed' };
  }
};

export { handler };

// ============================================================
// Helpers (server-side, service-role; bypasses RLS)
// ============================================================
async function createOrderOnServer(
  supabase: SupabaseClient,
  input: {
    items: LineItem[];
    shipping: Address;
    currency: string;
    couponCode: string | null;
  },
): Promise<{ orderId: string; orderNo: string } | null> {
  // Generate short readable order_no: OMT + 8 base32 chars + 2 random suffix.
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 8; i++) body += alpha[Math.floor(Math.random() * alpha.length)];
  const suffix = String(Math.floor(Math.random() * 256)).padStart(2, '0');
  const orderNo = `OMT${body}-${suffix}`;

  const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  const { data: order, error: e1 } = await supabase
    .from('orders')
    .insert({
      order_no: orderNo,
      // user_id is null for guest checkout in Phase 1.2; Phase 1.3 will
      // require auth before checkout.
      user_id: null,
      subtotal,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: subtotal,
      currency: input.currency,
      coupon_code: input.couponCode,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'stripe',
      ship_name: input.shipping.name,
      ship_phone: input.shipping.phone,
      ship_region: input.shipping.region,
      ship_detail: input.shipping.detail,
    })
    .select('id, order_no')
    .single();

  if (e1 || !order) {
    // eslint-disable-next-line no-console
    console.error('[stripe-session] order insert:', e1);
    return null;
  }

  if (input.items.length > 0) {
    const { error: e2 } = await supabase.from('order_items').insert(
      input.items.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        product_name: { zh: it.name, en: it.name },
        cover: it.cover,
        unit_price: it.unitPrice,
        qty: it.qty,
        subtotal: it.unitPrice * it.qty,
      })),
    );
    if (e2) {
      // eslint-disable-next-line no-console
      console.error('[stripe-session] order_items insert:', e2);
      // Order header is already committed; Phase 1.5 surfaces this as a
      // reconciliation job rather than a hard fail.
    }
  }

  return { orderId: order.id, orderNo: order.order_no };
}
