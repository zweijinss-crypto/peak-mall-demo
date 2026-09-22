/**
 * rate-limit — server-side attempt limiter for admin login + checkout.
 *
 * Phase 2.7 — gates `AdminLoginForm` (5 attempts / 5min / IP) and
 * `createCheckoutSession` (20 / 5min / IP). The client preflights
 * this endpoint before firing the real auth/payment call so the
 * lockout feedback ("try again in N seconds") is visible without
 * actually consuming a Supabase / Stripe API call.
 *
 * Returns:
 *   200 { allowed: true }                → caller may proceed
 *   429 { allowed: false, retryAfter: N } → caller must back off
 *
 * Why netlify function and not Edge Middleware?
 *   The site uses Next.js static export; middleware runs at build
 *   time on the CDN edge and can't reach Supabase service-role
 *   keys. A netlify function is reachable from the browser and
 *   carries the service-role env vars.
 *
 * Key naming:
 *   admin_login:<ip>      — 5 / 5min
 *   checkout:<ip>         — 20 / 5min
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { logger } from './_shared/logger';

interface RateLimitRequest {
  /** 'admin_login' | 'checkout' — selects the policy. */
  scope: 'admin_login' | 'checkout';
}

const POLICIES: Record<RateLimitRequest['scope'], { window: number; max: number }> = {
  admin_login: { window: 300, max: 5 },   // 5 attempts / 5 min
  checkout:    { window: 300, max: 20 },  // 20 attempts / 5 min
};

function clientIp(headers: Record<string, string | undefined>): string {
  // Netlify sets x-nf-client-connection-ip; fall back to common
  // forwarded headers when running elsewhere.
  return (
    headers['x-nf-client-connection-ip'] ??
    headers['x-forwarded-for']?.split(',')[0]?.trim() ??
    headers['cf-connecting-ip'] ??
    'unknown'
  );
}

export const handler: Handler = async (event) => {
  // Auth — the same internal-token gate as send-email / stripe-session.
  const expected = process.env.INTERNAL_API_TOKEN;
  if (expected) {
    const got = event.headers['x-internal-token'];
    if (got !== expected) {
      return { statusCode: 401, body: 'unauthorized' };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    logger.warn('rate-limit: INTERNAL_API_TOKEN unset — no auth (dev only)');
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method not allowed' };
  }

  let body: RateLimitRequest;
  try {
    body = JSON.parse(event.body ?? '{}') as RateLimitRequest;
  } catch {
    return { statusCode: 400, body: 'invalid JSON' };
  }

  if (!body.scope || !(body.scope in POLICIES)) {
    return { statusCode: 400, body: 'scope must be admin_login or checkout' };
  }

  const ip = clientIp(event.headers);
  const policy = POLICIES[body.scope];
  const key = `${body.scope}:${ip}`;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // Fail open: don't lock out customers because the rate limiter
    // is misconfigured. Logged so ops notices.
    logger.warn('rate-limit: supabase not configured — failing open', { key });
    return {
      statusCode: 200,
      body: JSON.stringify({ allowed: true, failOpen: true }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc('check_and_record', {
    p_key: key,
    p_window_seconds: policy.window,
    p_max_count: policy.max,
  });

  if (error) {
    logger.error('rate-limit: rpc failed', error, { scope: body.scope, ip });
    return {
      statusCode: 200,
      body: JSON.stringify({ allowed: true, failOpen: true }),
    };
  }

  const retryAfter = Number(data ?? 0);
  if (retryAfter > 0) {
    return {
      statusCode: 429,
      headers: { 'retry-after': String(retryAfter) },
      body: JSON.stringify({ allowed: false, retryAfter }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ allowed: true, retryAfter: 0 }),
  };
};