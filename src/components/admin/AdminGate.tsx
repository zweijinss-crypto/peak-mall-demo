'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthed, logout, verifyAdmin, getAdminMfaStatus } from '@/lib/admin/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/api/supabase-client';
import { useT } from '@/lib/use-t';

/**
 * AdminGate — client-side guard for every /admin/* page.
 *
 * Demo mode (no Supabase env): opens immediately, no auth check.
 * isAuthed() also returns true in demo mode (see auth.ts), so the
 * flag check below would otherwise run verifyAdmin() which calls
 * Supabase and fails — we skip that whole branch.
 *
 * Production mode:
 * 1. No localStorage flag + no Supabase session → let /admin/layout
 *    render the gate card (its single source of truth for "sign in").
 * 2. LocalStorage flag set → verifyAdmin() against Supabase to
 *    catch stale flags after a server-side role downgrade. Failure
 *    → logout + redirect to /admin/login?reason=not_admin.
 * 3. Phase 3.2 — if TOTP enabled and stale, bounce to /admin/mfa.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Demo mode short-circuit: open immediately, no async work.
    if (!isSupabaseConfigured()) {
      setOk(true);
      return () => {
        cancelled = true;
      };
    }
    if (!isAuthed()) {
      // No local flag AND no Supabase session? Let /admin/layout
      // render its gate card with a sign-in link. The layout is the
      // single source of truth for "you need to sign in" UI now.
      void (async () => {
        const supabase = getSupabase();
        if (!supabase) {
          // Static demo (Supabase not configured) — render the gate
          // card at layout level by yielding control here.
          if (!cancelled) setOk(false);
          return;
        }
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session?.user?.id) {
          if (!cancelled) setOk(false);
          return;
        }
        // We have a Supabase session but no local flag — verify and
        // either re-issue the flag or sign out.
        const verified = await verifyAdmin();
        if (cancelled) return;
        if (!verified) {
          await logout();
          router.replace('/admin/login?reason=not_admin');
          return;
        }
        setOk(true);
      })();
      return;
    }
    void (async () => {
      const verified = await verifyAdmin();
      if (cancelled) return;
      if (!verified) {
        await logout();
        router.replace('/admin/login?reason=not_admin');
        return;
      }
      // Phase 3.2 — 2FA gate. If the admin has TOTP enabled and
      // either hasn't verified yet or the last verify is older than
      // MFA_REFRESH_MINUTES, bounce them to /admin/mfa.
      const mfa = await getAdminMfaStatus();
      if (cancelled) return;
      if (mfa.totpEnabled && mfa.needsReverify) {
        router.replace('/admin/mfa');
        return;
      }
      setOk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (ok !== true) {
    // Either verifying or genuinely unauthenticated. When genuinely
    // unauthenticated, /admin/layout renders the gate card on top of
    // this loading state via its own check.
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center text-[13px] text-neutral-500">
        {t.admin.gateChecking ?? 'Checking sign-in…'}
      </div>
    );
  }
  return <>{children}</>;
}