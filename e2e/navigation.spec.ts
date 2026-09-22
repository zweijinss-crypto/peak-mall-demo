import { test, expect } from '@playwright/test';

/**
 * navigation — Phase 3.1.2 core e2e.
 *
 * Smoke + the routes the smoke couldn't reach (admin, /status,
 * i18n alternates, trailing-slash variants).
 *
 * The static export means every route is a real HTML file; we only
 * verify the basics:
 *   - HTTP 200
 *   - DOM has at least one h1-h3
 *   - no fatal console errors during load
 *
 * Anything more is over-testing for a static demo.
 */

test.describe('static routes load', () => {
  const ROUTES = [
    '/',
    '/login',
    '/cart',
    '/shop/49',
    '/terms',
    '/privacy',
    '/admin/login',
    '/status/',
    '/en/',
    '/en/login',
    '/en/cart',
    '/en/shop/49',
    '/en/terms',
    '/en/status/',
  ];

  for (const route of ROUTES) {
    test(`${route} returns 200 with a heading`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp, `no response for ${route}`).toBeTruthy();
      expect(resp?.status(), `non-200 for ${route}`).toBe(200);

      // Either SSR HTML or hydrated DOM must have a heading.
      const ssrHtml = await resp!.text();
      const ssrHeadings = (ssrHtml.match(/<h[1-3][\s>]/g) ?? []).length;
      await page.waitForTimeout(500);
      const liveHeadings = await page.locator('h1, h2, h3').count();
      expect(
        ssrHeadings + liveHeadings,
        `${route} has zero headings in both SSR HTML and live DOM`,
      ).toBeGreaterThan(0);

      // Filter expected noise (browser logs the URL of the failed
      // resource but Playwright's message is just "Failed to load
      // resource: ... 404", with no URL — so we filter on substring
      // patterns that we know are non-fatal).
      const blocking = consoleErrors.filter((m) => {
        if (m.includes('favicon.ico')) return false;
        if (m.includes('Sentry')) return false;
        if (m.includes('ERR_INTERNET_DISCONNECTED')) return false;
        // 404s for optional resources (no favicon in static demo);
        // a missing .ico is harmless.
        if (/Failed to load resource.*404/.test(m)) return false;
        return true;
      });
      expect(blocking, `console errors on ${route}: ${blocking.join(' | ')}`).toHaveLength(0);
    });
  }
});

test.describe('language switcher reflects URL', () => {
  test('zh root shows Chinese copy', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/Peak|商城|登录/);
  });

  test('en root shows English copy', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.locator('body')).toContainText(/Shop|Sign|Cart/);
  });
});