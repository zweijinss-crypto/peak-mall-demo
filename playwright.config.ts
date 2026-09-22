import { defineConfig, devices } from '@playwright/test';

/**
 * playwright.config — Phase 3.1.2 e2e config.
 *
 * Boots against `out/` (the static export) served by Playwright's
 * built-in webServer. Mirrors ci-smoke.mjs but with real @playwright/test
 * reporting + screenshot/video capture on failure.
 *
 * Run:
 *   pnpm ci:e2e  →  after `pnpm build`
 *
 * The config is intentionally minimal — add more specs under e2e/ as
 * flows grow (Phase 4 will add Stripe SDK + cart-to-checkout spec).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: './.playwright/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    // Don't block on HMR heartbeat (Next dev) — irrelevant for static export.
    navigationTimeout: 20_000,
    actionTimeout: 8_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: undefined },
    },
  ],
  webServer: {
    // Reuse the ci-smoke static server (kept for backwards compat).
    command: 'node scripts/ci-smoke.mjs --serve-only',
    port: 4321,
    cwd: '.',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});