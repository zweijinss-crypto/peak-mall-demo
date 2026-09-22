/**
 * supabase-client — browser-side Supabase client.
 *
 * Safe to import in client components and at module top level.
 * If env vars are missing, returns a stub that throws on use —
 * keeps the build green so the demo can still run with localStorage fallback.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;
let missingReported = false;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (!missingReported && typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY not set — falling back to localStorage mode.',
      );
      missingReported = true;
    }
    return null;
  }

  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cached;
}

/**
 * isSupabaseConfigured — call before any user-facing network op to
 * decide whether to hit Supabase or fall back to localStorage.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
