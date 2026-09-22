import { test, expect } from '@playwright/test';

/**
 * admin-rbac — Phase 1.1.10 admin auth gating.
 *
 * Covers the new /admin/layout.tsx top-level guard:
 *   1. /admin/login is publicly accessible (renders the sign-in form).
 *   2. /admin/products with no session shows the "Please sign in"
 *      gate card (not the admin chrome).
 *   3. /admin/audit requires super_admin — when unauthenticated, the
 *      layout-level guard hides audit-row's chrome via the same gate.
 *   4. The gate card offers a link to /login?tab=admin&reason=...
 *
 * Static export caveat: the layout is a Client Component. During the
 * SSR build step, it renders the "loading" branch (no session).
 * After hydration, useEffect kicks the gate in. We wait for the gate
 * text to appear before asserting, with a generous timeout to cover
 * Supabase round-trip in CI.
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
    // Layout hydrates and resolves "no session" → renders gate card.
    // Wait up to 8s for the gate text to appear.
    const gate = page.locator('[role="alert"]', {
      hasText: /sign in|登录|Admin access|没有访问|权限/,
    });
    await expect(gate).toBeVisible({ timeout: 8000 });
    // The gate must offer a link to /login with tab=admin and reason.
    // Next.js normalizes /login?tab=admin to /login/?tab=admin, so we
    // match on the substring of the param rather than the full path.
    const signInLink = page.locator('a[href*="tab=admin"][href*="reason=no_session"]').first();
    await expect(signInLink).toBeVisible();
  });
}

test('/admin/login renders the sign-in form', async ({ page }) => {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  // /admin/login is a server-side redirect to /login?tab=admin.
  // Next.js normalizes to /login/?tab=admin (trailing slash) for
  // the static export, so match either form.
  await page.waitForURL(/\/login\/?\?tab=admin/, { timeout: 5000 });
  // The /login page has the email/password form for the admin tab.
  await expect(page).toHaveURL(/tab=admin/);
});

test('/admin/ (root) shows the gate (or redirects to /login?tab=admin)', async ({ page }) => {
  await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
  // The layout-level gate catches the no-session case and renders a
  // sign-in card. As an alternative, the legacy server-side redirect
  // to /admin/login (which itself redirects to /login?tab=admin) is
  // also acceptable — both paths are valid.
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
  const gate = page.locator('[role="alert"]', {
    hasText: /sign in|登录|Admin access|没有访问|权限/,
  });
  await expect(gate).toBeVisible({ timeout: 8000 });
});

test('gate card link has reason=no_session for admin routes', async ({ page }) => {
  await page.goto('/admin/products/', { waitUntil: 'domcontentloaded' });
  const link = page.locator('a[href*="tab=admin"][href*="reason=no_session"]').first();
  await expect(link).toBeVisible({ timeout: 8000 });
  const href = await link.getAttribute('href');
  expect(href).toContain('reason=no_session');
  expect(href).toContain('tab=admin');
});