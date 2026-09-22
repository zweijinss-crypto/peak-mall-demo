/**
 * admin/auth — Supabase Auth gate for /admin/*.
 *
 * Flow:
 *   1. login(email, password) → supabase.auth.signInWithPassword
 *   2. After sign-in, fetch public.users row for this uid and check role
 *      - if role === 'admin': allow, persist "1" to localStorage as a
 *        sync fast-path flag (cleared on logout)
 *      - else: signOut immediately and return NOT_ADMIN
 *   3. isAuthed() is a sync fast-path that reads the localStorage flag;
 *      AdminGuard separately re-verifies with Supabase to catch stale
 *      flags from before a server-side role change.
 *
 * Offline fallback: if Supabase env is missing, falls back to the
 * demo creds (admin/admin123) so the static demo stays clickable.
 */
import { getSupabase, isSupabaseConfigured } from '@/lib/api/supabase-client';

const STORAGE_KEY = 'peak_admin_authed';

// Legacy demo creds — used ONLY when Supabase isn't configured
// (static demo on a host without NEXT_PUBLIC_SUPABASE_URL). Read
// from NEXT_PUBLIC_DEMO_ADMIN_USER / NEXT_PUBLIC_DEMO_ADMIN_PASS so
// deployers can override before the next build (no hardcoded creds
// shipped to public deployments). Falls back to admin/admin123 only
// when neither env var is set, to keep local dev friction-free.
export const DEMO_USERNAME: string =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_USER || 'admin';
export const DEMO_PASSWORD: string =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_PASS || 'admin123';

export type AdminAuthError =
  | 'MISSING_FIELDS'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NOT_ADMIN'
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface AdminAuthResult {
  ok: boolean;
  error?: AdminAuthError | string;
}

function writeFlag(v: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (v) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function mapAuthError(message: string): AdminAuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'INVALID_CREDENTIALS';
  if (m.includes('email not confirmed')) return 'EMAIL_NOT_CONFIRMED';
  if (m.includes('network') || m.includes('fetch')) return 'NETWORK';
  return 'UNKNOWN';
}

/**
 * isAuthed — sync fast-path. Returns true if the previous login wrote
 * the localStorage flag. Use AdminGuard for a server-verified check.
 *
 * In demo mode (Supabase not configured) we treat the session as
 * always-authed so deep-link targets like /admin/mfa don't bounce
 * back to /admin/login. The layout still gates real routes via the
 * Supabase branch, so this is a localStorage convenience only.
 */
export function isAuthed(): boolean {
  if (readFlag()) return true;
  // Demo mode short-circuit — process.env.NEXT_PUBLIC_SUPABASE_URL
  // is statically replaced at build time, so we read it synchronously.
  // In demo mode (no Supabase URL), treat the session as authed so
  // deep-link targets like /admin/mfa don't bounce to /admin/login.
  if (typeof window !== 'undefined') {
    const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!env) return true;
  }
  return false;
}

/**
 * login — Supabase Auth + role check.
 *
 * @param emailOrUsername — Supabase expects an email. The legacy
 *   "admin/admin123" form is also accepted when Supabase is not
 *   configured (offline demo fallback).
 * @param password
 */
export async function login(
  emailOrUsername: string,
  password: string,
): Promise<AdminAuthResult> {
  if (!emailOrUsername || !password) {
    return { ok: false, error: 'MISSING_FIELDS' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    if (!isSupabaseConfigured()) {
      // Offline fallback — legacy demo gate
      if (
        emailOrUsername === DEMO_USERNAME &&
        password === DEMO_PASSWORD
      ) {
        writeFlag(true);
        return { ok: true };
      }
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }
    // Env reported as configured but client couldn't init — treat as
    // unconfigured so the demo flow still works.
    return { ok: false, error: 'NOT_CONFIGURED' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailOrUsername,
    password,
  });
  if (error || !data.session || !data.user) {
    return {
      ok: false,
      error: error ? mapAuthError(error.message) : 'UNKNOWN',
    };
  }

  // Role check — public.users row is auto-created by handle_new_user
  // trigger (0002_auth_trigger.sql). Admin email is bootstrapped to
  // role='admin' in the same migration.
  let role: string | null = null;
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    role = (profile as { role?: string } | null)?.role ?? null;
  } catch {
    role = null;
  }

  if (role !== 'admin') {
    // Sign out immediately so a regular user can't hit admin APIs.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    writeFlag(false);
    return { ok: false, error: 'NOT_ADMIN' };
  }

  writeFlag(true);
  return { ok: true };
}

export async function logout(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore network errors on logout
    }
  }
  writeFlag(false);
}

/**
 * verifyAdmin — re-check role from Supabase. Used by AdminGuard on
 * mount to catch stale localStorage flags after a server-side role
 * downgrade.
 */
export async function verifyAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return readFlag();
  try {
    const sessionResult = supabase.auth.getSession() as unknown as {
      data: { session: { user?: { id?: string } } | null };
    };
    const uid = sessionResult.data.session?.user?.id;
    if (!uid) return false;
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .maybeSingle();
    const ok = (data as { role?: string } | null)?.role === 'admin';
    writeFlag(ok);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Phase 3.2 — admin TOTP status. Returns whether the caller has
 * enabled 2FA and when they last did a fresh verification. AdminGate
 * uses this to require re-verify every MFA_REFRESH_MINUTES.
 */
export interface AdminMfaStatus {
  totpEnabled: boolean;
  /** ISO timestamp of the last successful verify, or null. */
  verifiedAt: string | null;
  /** True when the last verify is older than MFA_REFRESH_MINUTES. */
  needsReverify: boolean;
}

export const MFA_REFRESH_MINUTES = 30;

export async function getAdminMfaStatus(): Promise<AdminMfaStatus> {
  const fallback = { totpEnabled: false, verifiedAt: null, needsReverify: false };
  const supabase = getSupabase();
  if (!supabase) return fallback;
  try {
    const sessionResult = supabase.auth.getSession() as unknown as {
      data: { session: { user?: { id?: string } } | null };
    };
    const uid = sessionResult.data.session?.user?.id;
    if (!uid) return fallback;
    const { data } = await supabase
      .from('users')
      .select('totp_enabled, totp_verified_at')
      .eq('id', uid)
      .maybeSingle();
    const row = data as { totp_enabled?: boolean; totp_verified_at?: string | null } | null;
    const enabled = Boolean(row?.totp_enabled);
    const verifiedAt = row?.totp_verified_at ?? null;
    let needsReverify = false;
    if (enabled && verifiedAt) {
      const ageMs = Date.now() - new Date(verifiedAt).getTime();
      needsReverify = ageMs > MFA_REFRESH_MINUTES * 60 * 1000;
    } else if (enabled) {
      // enabled but never verified — treat as needs verify
      needsReverify = true;
    }
    return { totpEnabled: enabled, verifiedAt, needsReverify };
  } catch {
    return fallback;
  }
}
