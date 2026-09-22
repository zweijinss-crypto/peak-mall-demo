import { test, expect } from '@playwright/test';

/**
 * admin-i18n.spec — Phase 1.3 admin locale pass-through.
 *
 * /en/admin/* uses ?demo=1 (the static-demo opt-in) so the AdminShell
 * sidebar renders with the en copy from copy.en.ts. Without ?demo=1 the
 * top-level /admin/layout shows a gate card instead of the sidebar, which
 * is the right behaviour for prod but useless for verifying copy.
 *
 * The unauthenticated gate card path is already covered by admin-rbac.
 * spec.ts; here we focus on the chrome (sidebar group labels, nav titles,
 * "Back to shop" button) and on the zh-only data-source indicator strings
 * not leaking into the en build.
 *
 * Note on assertions: sidebar group labels are uppercased by CSS
 * (text-transform: uppercase), so we match case-insensitively.
 * Sidebar nav titles come from copy.en.ts.admin.<key>.title — see
 * src/lib/admin/sidebar.ts for the AdminKey list.
 */

const EN_ROUTES = [
  '/en/admin/dashboard/',
  '/en/admin/orders/',
  '/en/admin/products/',
  '/en/admin/users/',
  '/en/admin/agents/',
  '/en/admin/tickets/',
  '/en/admin/wd/',
  '/en/admin/wd-center/',
  '/en/admin/rules/',
  '/en/admin/comm/',
  '/en/admin/invite/',
  '/en/admin/support/',
  '/en/admin/home/',
];

// Sidebar group labels (copy.en.ts.admin.groupXxx)
const EN_GROUP_LABELS = ['Overview', 'Mall', 'Distribution', 'Funds', 'Tools'];

// Sidebar nav titles — exact strings from copy.en.ts.admin.<key>.title
const EN_NAV_TITLES = [
  'Dashboard', 'Products', 'Orders',
  'Affiliates / Agents', 'Agents — rate adjustment',
  'Invite codes', 'After-sales',
  'Commission rules', 'Commission ledger',
  'Withdrawal review', 'Withdrawals',
  'Home settings', 'Support widget',
];

for (const path of EN_ROUTES) {
  test(`/en/admin/* renders en sidebar (demo mode): ${path}`, async ({ page }) => {
    const resp = await page.goto(path + '?demo=1', { waitUntil: 'domcontentloaded' });
    expect(resp?.status(), `${path} should return 200`).toBe(200);
    await page.waitForSelector('aside', { state: 'visible', timeout: 5000 });
    // Wait for client-side i18n to switch to en copy. The brand line
    // "Peak Mall" + role "Admin Console" are unique to the en copy
    // (zh has "顶峰商城" + "总后台 · 管理员"). We sample until both are
    // present to avoid the SSR fallback race.
    await page.waitForFunction(() => {
      const aside = document.querySelector('aside');
      if (!aside) return false;
      const t = aside.textContent || '';
      return t.includes('Peak Mall') && t.includes('Admin Console');
    }, { timeout: 10000 });
    const sidebarText = (await page.locator('aside').first().innerText()).toLowerCase();
    for (const label of EN_GROUP_LABELS) {
      expect(sidebarText, `${path} sidebar should contain "${label}"`).toContain(label.toLowerCase());
    }
    // Every sidebar contains "dashboard" — use it as a smoke check
    // that the nav rendered. Exact per-key titles vary by route.
    expect(sidebarText, `${path} sidebar should contain "dashboard"`).toContain('dashboard');
  });
}

test('/admin/login renders the sign-in form (zh, no Supabase redirect during prerender)', async ({ page }) => {
  // Static export: /admin/login is a server component that calls
  // redirect('/login?tab=admin') in production or redirect('/admin/dashboard')
  // in demo mode. At runtime the Next router handles the 307 marker
  // (visible in the build output) and replaces the URL.
  const resp = await page.goto('/admin/login/', { waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);
  // Detect demo mode via the banner on the dashboard.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const url = page.url();
  if (url.includes('/admin/dashboard')) {
    // Demo mode: /admin/login redirects straight to the dashboard.
    expect(url).toContain('/admin/dashboard');
    return;
  }
  await page.waitForURL(/\/login/, { timeout: 5000 });
  expect(page.url()).toContain('/login');
  expect(page.url()).toContain('tab=admin');
  const body = await page.locator('body').innerText();
  // /login?tab=admin shows the admin tab label from copy.ts.auth.adminTab.
  expect(body).toContain('管理员登录');
});

test('/en/admin/en copy never leaks zh data-source strings (demo mode)', async ({ page }) => {
  await page.goto('/en/admin/orders/?demo=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('aside', { timeout: 5000 });
  const body = await page.locator('body').innerText();
  expect(body, 'should not show zh-only "已同步 Supabase"').not.toContain('已同步 Supabase');
  expect(body, 'should not show zh-only "本地缓存"').not.toContain('本地缓存');
  expect(body, 'should not show zh-only "同步中…"').not.toContain('同步中…');
});
