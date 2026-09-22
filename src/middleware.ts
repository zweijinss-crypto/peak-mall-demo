/**
 * middleware — edge-runtime request gate.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie on every request that
 *      targets /admin/* (or its /en/ variant). Keeps the JWT alive
 *      so SSR-rendered admin pages don't see an expired session.
 *   2. Block direct GET /admin/* when the session is unauthenticated.
 *      We bounce to /login?tab=admin instead of letting the client
 *      gate flicker, because admin users tend to share deep-links.
 *   3. Let /admin/login through (sign-in page itself).
 *   4. Static assets, /api/* and non-/admin paths are untouched —
 *      keeps the matcher cheap.
 *
 * Why edge runtime: Supabase SSR's createServerClient needs cookies()
 * from next/headers, which only works in the edge runtime middleware
 * pipeline. The actual auth check still happens server-side via the
 * Supabase anon key (JWT in cookie is signed, anon can read).
 *
 * Demo mode (no NEXT_PUBLIC_SUPABASE_URL set in this build):
 *   - createServerClient would throw at import time. We early-return
 *     before touching it so the middleware is a no-op. The client-
 *     side AdminGate still keeps the demo usable.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_PATH_RE = /^\/(en\/)?admin(\/|$)/;
const ADMIN_LOGIN_RE = /^\/(en\/)?admin\/login\/?$/;

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // Only gate /admin/* — every other path passes through untouched.
  if (!ADMIN_PATH_RE.test(pathname)) {
    return NextResponse.next();
  }

  // /admin/login is the sign-in page itself — never block it.
  if (ADMIN_LOGIN_RE.test(pathname)) {
    return NextResponse.next();
  }

  // Demo mode: Supabase URL not embedded in this build. Middleware
  // becomes a no-op. The client AdminGate + AdminLayout still apply
  // demo-mode short-circuits so the static demo stays clickable.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next();
  }

  // Supabase SSR cookie adapter — refresh the session in-place so we
  // never redirect on an expiring JWT that the server could renew.
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh + read in one call. getUser() validates the JWT against
  // Supabase Auth (vs getSession() which is a local decode).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No session — bounce to /login?tab=admin with a reason hint the
    // login page knows how to render. Preserve the intended URL so
    // post-login we could deep-link back (Phase 1.3 follow-up).
    const loginUrl = new URL(
      pathname.startsWith('/en/') ? '/en/login/' : '/login/',
      origin,
    );
    loginUrl.searchParams.set('tab', 'admin');
    loginUrl.searchParams.set('reason', 'no_session');
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated. Role check happens client-side via AdminLayout /
  // AdminGate (those have richer error UX than a 403 redirect).
  // We could call Supabase from here to read public.users.role and
  // bounce non-admins, but each middleware request would add a
  // round-trip — and the layout already does it. Skip for now.
  return res;
}

/**
 * Matcher — only run middleware on /admin/* paths. Everything else
 * (static assets, /api/*, customer pages) gets the cheap pass-through.
 *
 * Note: Next.js applies this matcher BEFORE our pathname regex above.
 * If the matcher misses, the regex never fires. Keep them in sync.
 */
export const config = {
  matcher: ['/admin/:path*', '/en/admin/:path*'],
};