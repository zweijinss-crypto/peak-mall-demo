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
import { logger } from './_shared/logger';

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
  countryCode?: string;
  regionCode?: string;
}

// ---------------------------------------------------------------
// Phase 2.3 — tax rate lookup
// ---------------------------------------------------------------
//
// Static fallback map (must match seed data in
// supabase/migrations/0005_tax_rates.sql). When Supabase is
// configured we look up the row first; the static map is the
// fallback so the function still computes tax on a static
// export preview without a database.

const STATIC_TAX_FALLBACK: Record<string, number> = {
  'US': 0,
  'US:CA': 0.0825,
  'US:NY': 0.04,
  'US:TX': 0.0625,
  'US:WA': 0.065,
  'US:FL': 0.06,
  'DE': 0.19,
  'FR': 0.2,
  'NL': 0.21,
  'IT': 0.22,
  'ES': 0.21,
  'GB': 0.2,
  'CA': 0.05,
  'CA:ON': 0.13,
  'CA:BC': 0.12,
  'CA:QC': 0.1495,
  'CN': 0,
  'HK': 0,
  'JP': 0.1,
  'SG': 0.09,
  'KR': 0.1,
  'AU': 0.1,
  'NZ': 0.15,
};

async function lookupTaxRate(
  supabase: SupabaseClient | null,
  countryCode: string | undefined,
  regionCode: string | undefined,
): Promise<number> {
  const cc = (countryCode ?? '').toUpperCase();
  const rc = (regionCode ?? '').toUpperCase();
  if (!cc) return 0;

  if (supabase) {
    // Try (country, region) first, then fall back to country-only.
    // Cast through `any` because the generated Supabase types do not
    // yet know about tax_rates (it was added in 0005 after the type
    // regeneration snapshot).
    const try1 = await supabase
      .from('tax_rates')
      .select('rate')
      .eq('country_code', cc)
      .eq('region', rc)
      .maybeSingle();
    const r1 = (try1.data as { rate?: number } | null)?.rate;
    if (r1 != null) return Number(r1);

    if (rc) {
      const try2 = await supabase
        .from('tax_rates')
        .select('rate')
        .eq('country_code', cc)
        .eq('region', '')
        .maybeSingle();
      const r2 = (try2.data as { rate?: number } | null)?.rate;
      if (r2 != null) return Number(r2);
    }
  }

  // Static fallback
  if (rc) {
    const v = STATIC_TAX_FALLBACK[`${cc}:${rc}`];
    if (v !== undefined) return v;
  }
  return STATIC_TAX_FALLBACK[cc] ?? 0;
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
  if (!stripe) {
    logger.warn('stripe-session: Stripe not configured');
    return { statusCode: 503, body: 'Stripe not configured' };
  }

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
      // Phase 2.3 — pre-computed tax is forwarded so Stripe displays
      // it on the Checkout page (and we don't have to rely on Stripe
      // Tax auto-calculation which needs a separate setup).
      ...(created.taxCents > 0 ? { tax_amount_cents: created.taxCents } : {}),
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
    logger.error('stripe-session: create failed', err);
    await logger.flush();
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
): Promise<{ orderId: string; orderNo: string; taxCents: number } | null> {
  // Generate short readable order_no: OMT + 8 base32 chars + 2 random suffix.
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 8; i++) body += alpha[Math.floor(Math.random() * alpha.length)];
  const suffix = String(Math.floor(Math.random() * 256)).padStart(2, '0');
  const orderNo = `OMT${body}-${suffix}`;

  const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  // Phase 2.3 — compute tax by (country, region).
  // unitPrice is in cents (matches Stripe unit_amount); subtotal is
  // also cents. taxAmount returned is in cents to align with orders.tax.
  const taxRate = await lookupTaxRate(
    supabase,
    input.shipping.countryCode,
    input.shipping.regionCode,
  );
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  const { data: order, error: e1 } = await supabase
    .from('orders')
    .insert({
      order_no: orderNo,
      // user_id is null for guest checkout in Phase 1.2; Phase 1.3 will
      // require auth before checkout.
      user_id: null,
      subtotal,
      shipping: 0,
      tax: taxAmount,
      tax_rate: taxRate,
      country_code: (input.shipping.countryCode ?? '').toUpperCase() || null,
      region_code: (input.shipping.regionCode ?? '').toUpperCase() || null,
      discount: 0,
      total,
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
    logger.error('stripe-session: order insert failed', e1);
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
      logger.error('stripe-session: order_items insert failed', e2, {
        orderId: order.id,
      });
      // Order header is already committed; Phase 1.5 surfaces this as a
      // reconciliation job rather than a hard fail.
    }
  }

  // Phase 2.1 — reserve inventory for every line item. We do this after
  // the order + items are persisted so that a stock failure can be
  // surfaced as a 4xx with the order id for the client to retry / cancel.
  for (const it of input.items) {
    const { error: rpcErr } = await supabase.rpc('reserve_stock', {
      p_product_id: it.productId,
      p_qty: it.qty,
      p_order_id: order.id,
      p_reason: 'stripe_session_created',
    });
    if (rpcErr) {
      logger.error('stripe-session: reserve_stock failed', rpcErr, {
        productId: it.productId,
        qty: it.qty,
        orderId: order.id,
      });
      // Roll back the order so the customer can retry
      await supabase.from('orders').delete().eq('id', order.id);
      return null;
    }
  }

  return { orderId: order.id, orderNo: order.order_no, taxCents: taxAmount };
}
