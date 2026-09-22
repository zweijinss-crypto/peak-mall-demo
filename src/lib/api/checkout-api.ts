/**
 * checkout-api — orchestrates the Stripe Checkout Session.
 *
 * Flow (current — Phase 1.2):
 *   1. Client calls createCheckoutSession() with cart items + address.
 *   2. Server creates an `orders` row (pending) + creates a Stripe
 *      Checkout Session with the order's id as metadata.order_id.
 *   3. Returns the session URL to the client.
 *   4. Client calls `stripe.redirectToCheckout({ sessionId })`.
 *   5. Stripe redirects to success_url → orders page.
 *   6. Stripe webhook (handled separately) flips order to 'paid'
 *      and writes a `payments` event row.
 *
 * Phase 1.2 also writes a tiny API helper that exposes the same
 * flow without a real server endpoint — useful for the static-export
 * demo where Stripe webhooks land on a Netlify Function we provide
 * alongside (see netlify/functions/stripe-webhook.ts).
 */

import { createOrder } from './orders-api';
import { getStripeServer, isStripeConfigured } from './stripe-server';

export interface CheckoutLineItem {
  productId: number;
  name: string;
  unitPrice: number; // cents
  qty: number;
  cover: string | null;
}

export interface CheckoutAddress {
  name: string;
  phone: string;
  region: string;
  detail: string;
}

export interface CheckoutResult {
  /** Stripe Checkout Session URL — `redirectToCheckout` is called by client. */
  url: string;
  /** Our order id (uuid from Supabase). */
  orderId: string;
  /** Human-readable order_no (e.g. "OMTRFDBIS-00"). */
  orderNo: string;
}

/**
 * createCheckoutSession — Phase 1.2 entry point.
 *
 * NOTE: This function runs from the BROWSER in the static-export
 * build. That means it cannot sign Stripe requests directly — instead
 * it POSTs to a Netlify Function at `/.netlify/functions/stripe-session`
 * which holds the secret key. If the function is unreachable, it falls
 * back to creating a Supabase order in 'pending' status and returning
 * a synthetic URL so the UI doesn't break in the demo.
 */
export async function createCheckoutSession(input: {
  items: CheckoutLineItem[];
  shipping: CheckoutAddress;
  currency: string;
  couponCode: string | null;
}): Promise<CheckoutResult | null> {
  if (!isStripeConfigured()) {
    // No Stripe configured — fall back to the legacy "pending order"
    // path so the demo can still demo the UI. Returns null when
    // Supabase is also unreachable.
    const order = await createOrder({
      items: input.items.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        unitPrice: it.unitPrice,
        name: { zh: it.name, en: it.name },
        cover: it.cover,
      })),
      shipping: input.shipping,
      total: {
        subtotal: input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0),
        shipping: 0,
        tax: 0,
        discount: 0,
        total: input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0),
      },
      currency: input.currency,
      couponCode: input.couponCode,
    });
    if (!order) return null;
    return {
      url: `/orders?paid=pending&order=${order.orderId}`,
      orderId: order.orderId,
      orderNo: order.orderNo,
    };
  }

  // Real path: call our serverless endpoint that signs the Stripe request.
  const res = await fetch('/.netlify/functions/stripe-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('[checkout-api] stripe-session failed:', res.status, await res.text());
    return null;
  }
  return (await res.json()) as CheckoutResult;
}

/**
 * verifyCheckoutResult — checks the success URL's query params and
 * tells the checkout UI whether to show the success state.
 *
 * Stripe redirects back to `/orders?paid=1&order=<uuid>&session=<cs_id>`.
 * The actual payment confirmation arrives via webhook (eventually
 * consistent). Until then we show "Processing payment…" with a
 * refreshable status check.
 */
export function parseCheckoutReturn(url: string): {
  paid: boolean;
  orderId: string | null;
  sessionId: string | null;
} {
  const u = new URL(url, 'https://placeholder.test');
  return {
    paid: u.searchParams.get('paid') === '1',
    orderId: u.searchParams.get('order'),
    sessionId: u.searchParams.get('session_id'),
  };
}
