/**
 * health — public health check endpoint for the status page.
 *
 * Phase 3.3.2 — basic /api/health probe that returns the current
 * status of critical integrations. Consumed by /status (and any
 * external uptime checker).
 *
 * Returns:
 *   { ok, checks: { supabase, stripe, resend, build }, version, ts }
 *
 * Each check is run with a short timeout so a slow dependency doesn't
 * hang the probe. Failures return ok: false but never throw — this is
 * the one endpoint that should always respond quickly.
 */

import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface CheckStatus {
  ok: boolean;
  /** Optional detail for the status page (latency ms, error reason). */
  detail?: string;
  /** Latency in ms. */
  ms: number;
}

async function time<T>(p: Promise<T>, ms = 0): Promise<{ result?: T; err?: unknown; ms: number }> {
  const start = Date.now();
  try {
    const result = await p;
    return { result, ms: Date.now() - start };
  } catch (err) {
    return { err, ms: Date.now() - start };
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

export const handler: Handler = async () => {
  const checks: Record<string, CheckStatus> = {};
  const TIMEOUT = 1500;

  // 1. Build/version (always present, never fails)
  checks.build = {
    ok: true,
    ms: 0,
    detail: process.env.NETLIFY_COMMIT_REF?.slice(0, 7) ?? 'dev',
  };

  // 2. Supabase — ping the auth admin endpoint (cheap)
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    const sb = await time(
      withTimeout(
        Promise.resolve(
          createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
            .from('users')
            .select('id', { head: true, count: 'exact' })
            .limit(1),
        ).then(() => 'ok' as const),
        TIMEOUT,
      ),
    );
    checks.supabase = sb.err
      ? { ok: false, ms: sb.ms, detail: String((sb.err as Error).message).slice(0, 80) }
      : { ok: true, ms: sb.ms };
  } else {
    checks.supabase = { ok: false, ms: 0, detail: 'env not configured' };
  }

  // 3. Stripe — ping balance endpoint
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });
    const st = await time(withTimeout(stripe.balance.retrieve(), TIMEOUT));
    checks.stripe = st.err
      ? { ok: false, ms: st.ms, detail: String((st.err as Error).message).slice(0, 80) }
      : { ok: true, ms: st.ms };
  } else {
    checks.stripe = { ok: false, ms: 0, detail: 'env not configured' };
  }

  // 4. Resend — skipped (would cost an API call); report config-only.
  checks.resend = process.env.RESEND_API_KEY
    ? { ok: true, ms: 0, detail: 'configured' }
    : { ok: false, ms: 0, detail: 'env not configured' };

  const ok = Object.values(checks).every((c) => c.ok);

  return {
    statusCode: ok ? 200 : 503,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify({
      ok,
      version: process.env.NETLIFY_COMMIT_REF?.slice(0, 7) ?? 'dev',
      ts: new Date().toISOString(),
      checks,
    }),
  };
};