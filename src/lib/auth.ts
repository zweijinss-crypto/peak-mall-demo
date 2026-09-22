/**
 * auth — Supabase Auth wrapper for the user-facing app.
 *
 * - login / register are real Supabase Auth calls
 * - public.users row is auto-created by the handle_new_user trigger
 *   (supabase/migrations/0002_auth_trigger.sql)
 * - getCurrentUser reads from Supabase session (sync) — needs the
 *   cached session in supabase-js (persistSession: true)
 * - logout clears Supabase session
 *
 * Offline fallback: if NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY aren't set,
 * falls back to a localStorage-backed session so the static export
 * keeps working in preview environments. The fallback is gated by
 * `isSupabaseConfigured()`.
 */
import { getSupabase, isSupabaseConfigured } from '@/lib/api/supabase-client';

export interface AuthUser {
  email: string;
  nickname?: string;
  loggedInAt: number;
  role?: string;
}

const FALLBACK_KEY = 'peak_auth_user';

export type AuthError =
  | 'MISSING_FIELDS'
  | 'PASSWORD_TOO_SHORT'
  | 'INVALID_EMAIL'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface AuthResult {
  ok: boolean;
  error?: AuthError | string;
  user?: AuthUser;
}

// ---------------------------------------------------------------
// Offline fallback (demo mode)
// ---------------------------------------------------------------

function readFallbackUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeFallbackUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(FALLBACK_KEY);
  } catch {
    // ignore quota errors
  }
}

function localFallbackLogin(
  email: string,
  password: string,
): AuthResult {
  if (!email || !password) return { ok: false, error: 'MISSING_FIELDS' };
  if (password.length < 6) return { ok: false, error: 'PASSWORD_TOO_SHORT' };
  if (!email.includes('@')) return { ok: false, error: 'INVALID_EMAIL' };
  const user: AuthUser = { email, loggedInAt: Date.now(), role: 'user' };
  writeFallbackUser(user);
  return { ok: true, user };
}

// ---------------------------------------------------------------
// Supabase path
// ---------------------------------------------------------------

function mapAuthError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'INVALID_CREDENTIALS';
  if (m.includes('email not confirmed')) return 'EMAIL_NOT_CONFIRMED';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'EMAIL_TAKEN';
  if (m.includes('network') || m.includes('fetch')) return 'NETWORK';
  return 'UNKNOWN';
}

async function loginImpl(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!email || !password) return { ok: false, error: 'MISSING_FIELDS' };
  if (!email.includes('@')) return { ok: false, error: 'INVALID_EMAIL' };

  const supabase = getSupabase();
  if (!supabase) {
    if (!isSupabaseConfigured()) return { ok: false, error: 'NOT_CONFIGURED' };
    return localFallbackLogin(email, password);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  const session = data.session;
  const u = data.user;
  if (!session || !u) return { ok: false, error: 'UNKNOWN' };

  // Fetch role from public.users (RLS: own row readable)
  let role: string | undefined;
  let nickname: string | undefined =
    (u.user_metadata?.nickname as string | undefined) ?? undefined;
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('role, nickname')
      .eq('id', u.id)
      .maybeSingle();
    if (profile) {
      role = (profile as { role?: string }).role;
      nickname = (profile as { nickname?: string }).nickname ?? nickname;
    }
  } catch {
    // public.users row may not exist yet on a fresh signup race — ignore
  }

  return {
    ok: true,
    user: {
      email: u.email ?? email,
      nickname,
      loggedInAt: Date.now(),
      role,
    },
  };
}

async function registerImpl(input: {
  email: string;
  password: string;
  nickname?: string;
}): Promise<AuthResult> {
  const { email, password, nickname } = input;
  if (!email || !password) return { ok: false, error: 'MISSING_FIELDS' };
  if (password.length < 6) return { ok: false, error: 'PASSWORD_TOO_SHORT' };
  if (!email.includes('@')) return { ok: false, error: 'INVALID_EMAIL' };

  const supabase = getSupabase();
  if (!supabase) {
    if (!isSupabaseConfigured()) return { ok: false, error: 'NOT_CONFIGURED' };
    // Local fallback: register == login (no password persistence)
    return localFallbackLogin(email, password);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: nickname ? { nickname } : undefined },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };

  const session = data.session;
  const u = data.user;
  if (!u) return { ok: false, error: 'UNKNOWN' };

  // If email confirmation is required, session is null — treat as
  // soft success so the UI can show a "check your inbox" message.
  if (!session) {
    return {
      ok: true,
      user: {
        email: u.email ?? email,
        nickname,
        loggedInAt: Date.now(),
        role: 'user',
      },
    };
  }

  return {
    ok: true,
    user: {
      email: u.email ?? email,
      nickname,
      loggedInAt: Date.now(),
      role: 'user',
    },
  };
}

async function logoutImpl(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore network errors on logout
    }
  }
  writeFallbackUser(null);
}

function getCurrentUserImpl(): AuthUser | null {
  // Fast path: use cached session if available. This is sync to keep
  // the existing caller shape (profile/sidebar/header don't await).
  if (typeof window === 'undefined') return null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const sessionResult = supabase.auth.getSession() as unknown as {
        data: {
          session: {
            user?: { email?: string; user_metadata?: { nickname?: string } };
          } | null;
        };
      };
      const s = sessionResult.data.session;
      if (s?.user) {
        return {
          email: s.user.email ?? '',
          nickname: s.user.user_metadata?.nickname,
          loggedInAt: Date.now(),
        };
      }
    } catch {
      // fall through to localStorage fallback
    }
  }
  return readFallbackUser();
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export const login = async (
  email: string,
  password: string,
): Promise<AuthResult> => loginImpl(email, password);

export const register = async (input: {
  email: string;
  password: string;
  nickname?: string;
}): Promise<AuthResult> => registerImpl(input);

export const getCurrentUser = (): AuthUser | null => getCurrentUserImpl();

export const logout = async (): Promise<void> => logoutImpl();

// Subscribe to auth state changes (e.g. signin from another tab).
// Returns the unsubscribe function.
export function onAuthStateChange(
  cb: (user: AuthUser | null) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    if (!u) {
      cb(null);
      return;
    }
    cb({
      email: u.email ?? '',
      nickname: (u.user_metadata?.nickname as string | undefined) ?? undefined,
      loggedInAt: Date.now(),
    });
  });
  return () => data.subscription.unsubscribe();
}

// ---------------------------------------------------------------
// Phase 1.4 — password reset flow
// ---------------------------------------------------------------

/**
 * Request a password reset link by sending a Supabase Auth magic email.
 *
 * The user gets an email from Supabase's built-in SMTP; we override
 * the redirectTo so the link lands on /reset-password on this site.
 *
 * @returns ok:false with NOT_CONFIGURED when Supabase env is missing.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; error?: AuthError | string }> {
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'INVALID_EMAIL' };
  }
  const supabase = getSupabase();
  if (!supabase) {
    if (!isSupabaseConfigured()) return { ok: false, error: 'NOT_CONFIGURED' };
    return { ok: false, error: 'UNKNOWN' };
  }

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
      : `${baseUrl}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}

/**
 * Update the password of the currently signed-in user. Used after the
 * user clicks the email link and lands on /reset-password.
 */
export async function updatePassword(
  newPassword: string,
): Promise<{ ok: boolean; error?: AuthError | string }> {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'PASSWORD_TOO_SHORT' };
  }
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'NOT_CONFIGURED' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}
