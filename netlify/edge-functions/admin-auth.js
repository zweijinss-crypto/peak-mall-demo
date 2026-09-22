/**
 * netlify/edge-functions/admin-auth.js
 *
 * Netlify Edge Function that gates /admin/* paths. Mirrors
 * src/middleware.ts so the same auth policy applies whether we
 * deploy as a static export (Netlify Edge) or as a Next.js runtime
 * (Vercel/Netlify serverless, where middleware.ts fires).
 *
 * Triggered by [functions.admin-auth] block in netlify.toml:
 *   [[edge_functions]]
 *   path = "/admin/*"
 *   function = "admin-auth"
 *   path = "/en/admin/*"
 *   function = "admin-auth"
 *
 * Flow:
 *   1. /admin/login (and /en/admin/login) is the sign-in page itself
 *      — let it through.
 *   2. If Supabase env vars are NOT set (static demo build), pass
 *      through. The client AdminGate handles demo-mode UX.
 *   3. Read sb-access-token cookie. If absent, redirect to
 *      /login?tab=admin&reason=no_session.
 *   4. If present, validate the JWT by calling Supabase
 *      /auth/v1/user with the anon key. On 401, redirect; on 200,
 *      pass through. Role check stays client-side (handled by
 *      AdminLayout / AdminGate for richer error UX).
 *
 * Why we don't do role-check in the edge: each request would
 * round-trip Supabase. The client gate already reads the role on
 * mount and bouncers non-admins to /admin/dashboard?reason=forbidden.
 * Edge role check is a Phase 1.3 follow-up once we have a server-
 * side session helper.
 */

const ADMIN_LOGIN_RE = /^\/(en\/)?admin\/login\/?$/;

export default async (request, context) => {
  const url = new URL(request.url);
  const { pathname, origin } = url;

  // Let the sign-in page through.
  if (ADMIN_LOGIN_RE.test(pathname)) {
    return context.next();
  }

  // Demo mode: no Supabase env. Pass through; AdminGate + AdminLayout
  // handle demo UX. (netlify.toml should set NEXT_PUBLIC_SUPABASE_URL
  // in [build.environment] for prod; missing means this build is
  // intentionally a static demo.)
  const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnon = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnon) {
    return context.next();
  }

  // Extract sb-access-token cookie. Supabase's default cookie name in
  // @supabase/ssr is "sb-<project-ref>-auth-token"; we don't know the
  // project ref here, so scan all cookies for any "-auth-token" entry.
  const cookies = request.headers.get('cookie') ?? '';
  const match = cookies.match(/sb-[^=]+-auth-token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (!token) {
    return redirectToLogin({ origin, pathname, reason: 'no_session' });
  }

  // Validate the JWT against Supabase. /auth/v1/user returns 200 +
  // user JSON on success, 401 on bad/expired token.
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnon,
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      return redirectToLogin({ origin, pathname, reason: 'no_session' });
    }
    if (!res.ok) {
      // Unknown Supabase error — fail open to avoid locking out admins
      // on transient Supabase outages. AdminLayout's client gate will
      // still gate the page once the Supabase call succeeds.
      return context.next();
    }
    return context.next();
  } catch {
    // Network blip — fail open. Client gate will catch it.
    return context.next();
  }
};

function redirectToLogin({ origin, pathname, reason }) {
  const isEn = pathname.startsWith('/en/');
  const loginUrl = new URL(isEn ? '/en/login/' : '/login/', origin);
  loginUrl.searchParams.set('tab', 'admin');
  loginUrl.searchParams.set('reason', reason);
  loginUrl.searchParams.set('next', pathname);
  return Response.redirect(loginUrl.toString(), 302);
}

export const config = {
  // Mirror middleware.ts matcher. Netlify applies this BEFORE the
  // function body, so the regex above only ever sees /admin/* paths.
  path: ['/admin/*', '/en/admin/*'],
};