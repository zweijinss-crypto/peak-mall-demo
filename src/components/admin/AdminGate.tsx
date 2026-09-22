'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthed, logout, verifyAdmin, getAdminMfaStatus } from '@/lib/admin/auth';

/**
 * AdminGate — client-side guard for every /admin/* page.
 *
 * 1. Sync fast-path: if localStorage flag is missing → redirect to
 *    /admin/login immediately.
 * 2. On mount, verifyAdmin() re-checks public.users.role === 'admin'
 *    against Supabase to catch stale flags after a server-side role
 *    downgrade. If role isn't admin → logout + redirect to /admin/login
 *    with `?reason=not_admin`.
 *
 * Renders a lightweight placeholder during the check to avoid flashing
 * the admin chrome before the redirect.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthed()) {
      router.replace('/admin/login');
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
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center text-[13px] text-neutral-500">
        正在校验登录态…
      </div>
    );
  }
  return <>{children}</>;
}
