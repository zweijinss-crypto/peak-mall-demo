/**
 * /admin/* layout — top-level RBAC gate.
 *
 * Why a layout instead of a per-page redirect: every /admin/* page
 * inherits this. New admin pages get the gate for free; forgetting
 * the redirect is the most common auth-bypass bug in admin apps.
 *
 * Gates:
 *   1. Must have a Supabase auth session (sb.auth.getUser()).
 *   2. Must hold at least one admin role (admin_roles JSONB).
 *   3. If the route maps to a specific resource (ROUTE_RESOURCE),
 *      the caller must hold `read` on it. /admin/audit additionally
 *      requires super_admin (RLS is the source of truth, this is UX).
 *
 * Falls back to local mock auth when Supabase isn't configured so
 * the demo still works offline — dev login accepts any password.
 *
 * Static export note: this is a Client Component. During `next build`
 * it renders with no session (server-side sees an empty store) and
 * bails out with a loading skeleton. The actual gate fires on the
 * client after hydration, which is correct for an SPA-style admin
 * shell — there's no SEO risk because /admin/* is noindex anyway.
 */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

import { getSupabase } from '@/lib/api/supabase-client';
import { isSupabaseConfigured } from '@/lib/api';
import { useT } from '@/lib/use-t';
import {
  ROUTE_RESOURCE,
  ROLE_LABEL,
  canSync,
  getMyAdminRoles,
  type AdminRole,
  type AdminResource,
} from '@/lib/admin/rbac';

type GateState =
  | { kind: 'loading' }
  | { kind: 'denied'; reason: 'no_session' | 'no_role' | 'no_resource'; role?: Role }
  | { kind: 'ok'; role: Role };

type Role = {
  email: string;
  nickname: string | undefined;
  roles: AdminRole[];
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GateState>({ kind: 'loading' });

  // /admin/login is the sign-in screen itself — let it render
  // without checking auth (otherwise we'd infinite-loop).
  // Static export rewrites URLs to the trailing-slash form, so
  // match both shapes here.
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';

  useEffect(() => {
    if (isLoginPage) {
      setState({ kind: 'ok', role: { email: '', nickname: undefined, roles: [] } });
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = getSupabase();

      // No Supabase configured → static demo mode. Default-on while
      // we're still wiring up auth: any /admin/* page opens without a
      // sign-in step so reviewers can poke around. A red "Demo mode"
      // banner sits at the top of AdminShell to make the dev state
      // unmistakable. Switch to require sign-in once Supabase env is
      // set (see .env.example).
      if (!supabase) {
        if (!cancelled) {
          setState({
            kind: 'ok',
            role: {
              email: 'demo@local',
              nickname: 'Demo',
              roles: ['super_admin'],
            },
          });
        }
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      const email = sess.session?.user?.email ?? undefined;
      if (!uid) {
        if (!cancelled) setState({ kind: 'denied', reason: 'no_session' });
        return;
      }

      const roles = await getMyAdminRoles();
      if (roles.length === 0) {
        if (!cancelled) setState({ kind: 'denied', reason: 'no_role' });
        return;
      }

      const me: Role = { email: email ?? '', nickname: undefined, roles };

      // /admin/audit is super_admin only (already enforced by RLS, but
      // we hide the page here so the demo doesn't show empty data).
      if (pathname?.startsWith('/admin/audit') && !roles.includes('super_admin')) {
        if (!cancelled) setState({ kind: 'denied', reason: 'no_role', role: me });
        return;
      }

      // Resource-level read check for the current route. If the route
      // isn't mapped, treat as a "dashboard" pass-through.
      const resource: AdminResource | undefined = pathname
        ? ROUTE_RESOURCE[Object.keys(ROUTE_RESOURCE).find((k) => pathname.startsWith(k)) ?? '']
        : undefined;
      if (resource && !canSync(roles, resource, 'read')) {
        if (!cancelled) setState({ kind: 'denied', reason: 'no_resource', role: me });
        return;
      }

      if (!cancelled) setState({ kind: 'ok', role: me });
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoginPage, pathname]);

  if (isLoginPage) return <>{children}</>;

  if (state.kind === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-[40vh] flex items-center justify-center text-[13px] text-neutral-500"
      >
        {t.admin.loading ?? 'Loading admin…'}
      </div>
    );
  }

  if (state.kind === 'denied') {
    const reasonText =
      state.reason === 'no_session'
        ? t.admin.gateNoSession ?? 'Please sign in to access admin.'
        : state.reason === 'no_role'
          ? t.admin.gateNoRole ?? 'You do not have admin access.'
          : t.admin.gateNoResource ?? 'Your role does not have access to this page.';

    const loginHref = '/login?tab=admin&reason=' + state.reason;

    return (
      <div
        role="alert"
        className="min-h-[60vh] flex items-center justify-center p-6"
      >
        <div className="max-w-[420px] w-full bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <div className="text-[16px] font-bold text-neutral-900 mb-2">
            {t.admin.gateTitle ?? 'Admin access required'}
          </div>
          <div className="text-[13px] text-neutral-600 mb-5">{reasonText}</div>
          {state.role?.email ? (
            <div className="text-[12px] text-neutral-500 mb-5">
              {t.admin.gateSignedInAs ?? 'Signed in as'} <span className="font-mono">{state.role.email}</span>
              {state.role.roles.length > 0 && (
                <span className="ml-1">
                  ({state.role.roles.map((r) => ROLE_LABEL[r].zh).join(', ')})
                </span>
              )}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Link
              href={loginHref}
              className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-800 transition-colors"
            >
              {t.admin.gateSignIn ?? 'Sign in'}
            </Link>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-3 py-1.5 text-[12.5px] font-medium rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              {t.admin.gateBackHome ?? 'Back to site'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}