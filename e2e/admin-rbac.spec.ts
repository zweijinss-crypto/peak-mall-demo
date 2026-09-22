import { test, expect } from '@playwright/test';

/**
 * admin-rbac — Phase 1.1.10 admin auth gating.
 *
 * Covers the new /admin/layout.tsx top-level guard:
 *   1. /admin/login is publicly accessible (renders the sign-in form).
 *   2. /admin/products with no session shows the "Please sign in"
 *      gate card (not the admin chrome) — ONLY when Supabase env is set.
 *      In demo mode (no env) the layout opens directly and shows a
 *      "Demo mode" banner instead.
 *   3. /admin/audit requires super_admin — when unauthenticated, the
 *      layout-level guard hides audit-row's chrome via the same gate.
 *   4. The gate card offers a link to /login?tab=admin&reason=...
 *
 * Static export caveat: the layout is a Client Component. During the
 * SSR build step, it renders the "loading" branch (no session).
 * After hydration, useEffect kicks the gate in. We wait for the gate
 * text to appear before asserting, with a generous timeout to cover
 * Supabase round-trip in CI.
 *
 * Demo mode detection: we look for the "Demo mode" banner that the
 * AdminShell renders when isSupabaseConfigured() is false. In demo
 * mode the gate card is bypassed so any visitor can poke around.
 */

const ROUTES_REQUIRING_AUTH = [
  '/admin/products/',
  '/admin/orders/',
  '/admin/users/',
  '/admin/tickets/',
  '/admin/agents/',
  '/admin/wd/',
  '/admin/wd-center/',
  '/admin/rules/',
  '/admin/comm/',
  '/admin/invite/',
  '/admin/support/',
  '/admin/home/',
  '/admin/dashboard/',
  '/admin/mfa/',
];

for (const route of ROUTES_REQUIRING_AUTH) {
  test(`${route} shows the gate card when unauthenticated`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    // Wait for hydration: either the demo banner or the gate card.
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // Detect demo mode by sampling any admin page first; the banner
    // only renders inside AdminShell so /admin/mfa (which has its
    // own <main>) won't show it. Cheaper: probe /admin/dashboard/
    // for the banner, then come back to the original route.
    await page.goto('/admin/dashboard/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const demoBanner = page.locator('[role="note"]', { hasText: /Demo mode/ });
    const isDemoMode = (await demoBanner.count()) > 0;
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    if (isDemoMode) {
      // /admin/mfa renders its own self-contained card (no
      // AdminShell sidebar / banner). Wait for the mfa title to
      // appear (replaces the "Loading…" placeholder once mounted).
      if (route === '/admin/mfa/') {
        // waitFor: the h1 starts empty when !mounted, then fills
        // with the mfa title after effect runs. We just wait for
        // the heading to have non-empty text.
        await page.waitForFunction(() => {
          const h1 = document.querySelector('h1');
          return h1 && h1.textContent && h1.textContent.trim().length > 0;
        }, { timeout: 8000 });
        return;
      }
      // Demo mode: gate card is intentionally bypassed. The page
      // should render admin chrome (sidebar + Demo banner).
      const sidebar = page.locator('aside').first();
      await expect(sidebar, `${route} should show the admin sidebar in demo mode`).toBeVisible({ timeout: 8000 });
      await expect(demoBanner).toBeVisible();
      return;
    }
    // Production path: gate card with sign-in link.
    const gate = page.locator('[role="alert"]', {
      hasText: /sign in|登录|Admin access|没有访问|权限/,
    });
    await expect(gate).toBeVisible({ timeout: 8000 });
    const signInLink = page.locator('a[href*="tab=admin"][href*="reason=no_session"]').first();
    await expect(signInLink).toBeVisible();
  });
}

test('/admin/login renders the sign-in form (production) or skips in demo', async ({ page }) => {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const demoBanner = page.locator('[role="note"]', { hasText: /Demo mode/ });
  const isDemoMode = (await demoBanner.count()) > 0;
  if (isDemoMode) {
    // Demo mode: /admin/login redirects straight to /admin/dashboard
    // because everyone is auto-authed. The legacy login card is
    // irrelevant in demo mode.
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 5000 });
    return;
  }
  // Production: /admin/login is a server-side redirect to
  // /login?tab=admin. Next.js normalizes to /login/?tab=admin
  // (trailing slash) for the static export.
  await expect(page).toHaveURL(/tab=admin/, { timeout: 5000 });
});

test('/admin/ (root) shows the gate (or redirects to /login?tab=admin)', async ({ page }) => {
  await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const demoBanner = page.locator('[role="note"]', { hasText: /Demo mode/ });
  const isDemoMode = (await demoBanner.count()) > 0;
  if (isDemoMode) {
    // Demo mode: admin opens directly, sidebar must be visible.
    const sidebar = page.locator('aside').first();
    await expect(sidebar, 'admin should render sidebar in demo mode').toBeVisible({ timeout: 8000 });
    return;
  }
  // Production path: gate card or login redirect.
  await page.waitForTimeout(1500);
  const onLoginPage = /\/login\/?\?tab=admin/.test(page.url());
  const gateVisible = await page
    .locator('[role="alert"]', { hasText: /sign in|登录|Admin access/ })
    .first()
    .isVisible()
    .catch(() => false);
  expect(onLoginPage || gateVisible, `expected gate or login redirect, got ${page.url()}`).toBe(true);
});

test('/admin/audit shows gate (no session) — audit is super_admin only', async ({ page }) => {
  await page.goto('/admin/audit/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const demoBanner = page.locator('[role="note"]', { hasText: /Demo mode/ });
  const isDemoMode = (await demoBanner.count()) > 0;
  if (isDemoMode) {
    // Demo mode: layout grants super_admin by default so /admin/audit
    // opens directly. Verify the page chrome renders.
    const sidebar = page.locator('aside').first();
    await expect(sidebar, '/admin/audit should render sidebar in demo mode').toBeVisible({ timeout: 8000 });
    return;
  }
  const gate = page.locator('[role="alert"]', {
    hasText: /sign in|登录|Admin access|没有访问|权限/,
  });
  await expect(gate).toBeVisible({ timeout: 8000 });
});

test('gate card link has reason=no_session for admin routes', async ({ page }) => {
  await page.goto('/admin/products/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const demoBanner = page.locator('[role="note"]', { hasText: /Demo mode/ });
  const isDemoMode = (await demoBanner.count()) > 0;
  if (isDemoMode) {
    // Demo mode bypasses the gate — the sign-in link isn't rendered.
    test.skip(isDemoMode, 'gate-card link only exists in production (Supabase configured) mode');
    return;
  }
  const link = page.locator('a[href*="tab=admin"][href*="reason=no_session"]').first();
  await expect(link).toBeVisible({ timeout: 8000 });
  const href = await link.getAttribute('href');
  expect(href).toContain('reason=no_session');
  expect(href).toContain('tab=admin');
});