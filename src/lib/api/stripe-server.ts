/**
 * stripe-server — server-side Stripe SDK (used by webhook handler).
 *
 * Lazy-init so missing env vars don't crash the build. Returns null
 * when not configured (callers must check before use).
 *
 * Env:
 *   STRIPE_SECRET_KEY      — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET  — whsec_...
 */

import Stripe from 'stripe';

let cached: Stripe | null = null;
let reportedMissing = false;

export function getStripeServer(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    if (!reportedMissing && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[stripe-server] STRIPE_SECRET_KEY not set — payment endpoints disabled.',
      );
      reportedMissing = true;
    }
    return null;
  }
  if (!cached) {
    cached = new Stripe(key, {
      // Stripe SDK ships with its own pinned API version; overriding
      // here is brittle across SDK upgrades. Pin a stable one only if
      // you've validated the schema on your account.
      typescript: true,
      appInfo: {
        name: 'peak-mall-demo',
        version: '0.1.0',
      },
    });
  }
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
