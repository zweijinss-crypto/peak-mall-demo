/**
 * PostHog feature-flag client (Phase 3.5.1).
 *
 * Static export doesn't run middleware, so we can't reach PostHog's
 * server SDK. We use the official browser script (loaded via the
 * <PostHogProvider> component when NEXT_PUBLIC_POSTHOG_KEY is set)
 * and read flags from `window.posthog.getFeatureFlag()`.
 *
 * Three modes:
 *   - PostHog configured + window.posthog present → read live flag
 *   - PostHog configured but blocked / slow → fall back to cached value in localStorage
 *   - PostHog not configured → return deterministic bucketing by
 *     user-id-hash so dev can flip half of users without any network
 *
 * Bucketing (when no PostHog):
 *   hash(uid || 'anon') % 100 < rolloutPercent  → enabled
 * The hash is stable across reloads; SSR-safe (returns false on server).
 *
 * Usage:
 *   const variant = await isFlagOn('checkout-v2', { uid: 'user-123', rolloutPercent: 50 });
 *   if (variant === 'A') renderOld(); else renderNew();
 */

'use client';

const CACHE_PREFIX = 'pm_flag_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Stable hash of a string → uint32. Not cryptographic — just enough
 * distribution for bucketing.
 */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

interface FlagOptions {
  /** Stable user id (login email or uuid); omit for anonymous. */
  uid?: string | null;
  /** Rollout % when PostHog is not configured (0-100). */
  rolloutPercent?: number;
  /** Override default cache TTL. */
  cacheTtlMs?: number;
}

/**
 * Read a feature flag. Returns one of:
 *   - boolean (true = on, false = off)
 *   - string (for multi-variant flags like 'A' | 'B' | 'control')
 *   - undefined when the flag is unknown
 *
 * On the server (no window), always returns undefined.
 */
export async function isFlagOn(
  flag: string,
  opts: FlagOptions = {},
): Promise<boolean | string | undefined> {
  if (typeof window === 'undefined') return undefined;

  const phKey = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '').trim();
  const cached = readCache(flag, opts.cacheTtlMs ?? CACHE_TTL_MS);
  if (cached !== undefined) return cached;

  if (!phKey) {
    // No PostHog configured — deterministic bucketing for dev.
    const uid = opts.uid ?? 'anon';
    const pct = opts.rolloutPercent ?? 0;
    const enabled = hash(uid + ':' + flag) % 100 < pct;
    writeCache(flag, enabled);
    return enabled;
  }

  // PostHog configured but window.posthog may not be loaded yet.
  // Wait up to 1500ms for posthog to bootstrap before giving up.
  const ph = await waitForPostHog(1500);
  if (!ph) return undefined;

  try {
    const value = ph.getFeatureFlag(flag);
    if (value === undefined || value === null) {
      writeCache(flag, false);
      return false;
    }
    writeCache(flag, value);
    return value;
  } catch {
    return undefined;
  }
}

/**
 * Track a custom event. No-op if PostHog isn't loaded.
 */
export function trackEvent(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const ph = (window as unknown as { posthog?: { capture: (e: string, p: Record<string, unknown>) => void } }).posthog;
  if (ph) {
    try { ph.capture(event, props); } catch { /* noop */ }
  }
}

interface CachedFlag {
  v: boolean | string;
  t: number;
}

function readCache(flag: string, ttl: number): boolean | string | undefined {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + flag);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedFlag;
    if (Date.now() - parsed.t > ttl) return undefined;
    return parsed.v;
  } catch {
    return undefined;
  }
}

function writeCache(flag: string, v: boolean | string): void {
  try {
    const entry: CachedFlag = { v, t: Date.now() };
    window.localStorage.setItem(CACHE_PREFIX + flag, JSON.stringify(entry));
  } catch { /* quota exceeded — ignore */ }
}

interface PostHogApi {
  getFeatureFlag: (k: string) => boolean | string | undefined;
}

function waitForPostHog(timeoutMs: number): Promise<PostHogApi | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const ph = (window as unknown as { posthog?: PostHogApi }).posthog;
      if (ph) { resolve(ph); return; }
      if (Date.now() - start > timeoutMs) { resolve(null); return; }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}
