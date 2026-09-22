/**
 * rate-limit — client-side wrapper around the netlify rate-limit
 * function. Returns { allowed, retryAfter, failOpen }. When the
 * server says blocked, the caller surfaces "please try again in N
 * seconds" without spending the actual auth or Stripe call.
 *
 * Netlify responses are JSON-scoped; we just forward scope and read
 * the 200/429 body.
 */

export type RateLimitScope = 'admin_login' | 'checkout';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds; 0 when allowed
  failOpen?: boolean; // true when the server couldn't reach Supabase
}

export async function checkRateLimit(scope: RateLimitScope): Promise<RateLimitResult> {
  // In local dev or static preview without the function wired up,
  // skip the round-trip — the caller will surface real errors.
  if (typeof window === 'undefined') return { allowed: true, retryAfter: 0 };
  try {
    const res = await fetch('/.netlify/functions/rate-limit', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN
          ? { 'x-internal-token': process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN }
          : {}),
      },
      body: JSON.stringify({ scope }),
    });
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({ retryAfter: 60 }))) as {
        retryAfter?: number;
      };
      return { allowed: false, retryAfter: Number(data.retryAfter ?? 60) };
    }
    if (!res.ok) {
      // Fail open — same default as the server.
      return { allowed: true, retryAfter: 0 };
    }
    const data = (await res.json()) as RateLimitResult;
    return {
      allowed: Boolean(data.allowed),
      retryAfter: Number(data.retryAfter ?? 0),
      failOpen: Boolean(data.failOpen),
    };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}