/**
 * stripe-browser — browser-side Stripe.js loader.
 *
 * Lazy-loads the Stripe.js SDK and returns a singleton Stripe instance.
 * Used by checkout-page to call `stripe.redirectToCheckout()` after
 * the server creates a Checkout Session.
 *
 * Env (NEXT_PUBLIC_ so it's bundled):
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  — pk_test_... or pk_live_...
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js';

let cached: Promise<Stripe | null> | null = null;

export function getStripeBrowser(): Promise<Stripe | null> {
  if (cached) return cached;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn(
      '[stripe-browser] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set — redirect disabled.',
    );
    cached = Promise.resolve(null);
    return cached;
  }
  cached = loadStripe(key);
  return cached;
}

/** True when the publishable key is configured at build time. */
export function isStripeBrowserConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
