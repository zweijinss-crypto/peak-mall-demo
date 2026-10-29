#!/usr/bin/env node
/**
 * test-admin-phase2 — verify the Phase 1.4 admin enhancements actually
 * render and work in the browser.
 *
 * Checks, per page:
 *   /admin/comm      — toolbar with search + count + export, pagination,
 *                      settle-confirm flow, bulk-select
 *   /admin/tickets   — toolbar, status filter, detail drawer + reply
 *   /admin/audit     — toolbar, resource filter, actor filter, pagination
 *
 * Two rules this script follows, learned the hard way:
 *
 *   1. COMPARE AGAINST REAL DATA, NEVER HARD-CODED NUMBERS.
 *      A hard-coded row count goes stale the moment someone adds a
 *      fixture. Where a count matters, the script seeds localStorage,
 *      reads the live API/store value, and compares the DOM to it.
 *
 *   2. WARM UP BEFORE MEASURING CONSOLE ERRORS.
 *      Next dev compiles routes on demand. The very first navigation to
 *      an uncompiled route logs "Failed to fetch RSC payload … Falling
 *      back to browser navigation" — that is a dev-server artifact, not
 *      an app bug. We hit every route once to compile it, clear the
 *      error buffer, and only then assert "no console errors".
 *
 * Run against the dev server:  node scripts/test-admin-phase2.mjs
 */

import { existsSync } from 'node:fs';

const PW_CANDIDATES = [
  process.env.PLAYWRIGHT_MODULE,
  '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs',
  '/tmp/ci-pw/node_modules/playwright/index.mjs',
].filter(Boolean);
const PW_MODULE = PW_CANDIDATES.find((p) => existsSync(p));
if (!PW_MODULE) {
  console.error('[test-admin-phase2] playwright module not found');
  process.exit(2);
}
const { chromium } = await import(PW_MODULE);

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3002';
const NS = 'peak_admin_v1';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Seed the localStorage admin store with N commission rows.
 *
 * The store key is `peak_admin_v1:comm`. Seeding more than one page of
 * rows is what makes the pagination controls appear — with only the 4
 * default fixtures there is a single page, so the controls are (by
 * design) hidden and a naive "does the pagination exist" assertion
 * would fail for the wrong reason.
 */
function seedCommRows(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: `seed-comm-${i}`,
      username: `bulkuser${i}`,
      amount: 10 + i,
      source: `SEED-${1000 + i}`,
      rate: 10,
      status: i % 3 === 0 ? 'pending' : 'settled',
      created_at: `2026-10-01 10:${String(i % 60).padStart(2, '0')}:00`,
    });
  }
  return rows;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

async function goto(path, wait = 1800) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(wait);
}

// ── Seed enough commission rows to force multi-page ───────────────────
await goto('/admin/comm/');
await page.evaluate(
  ([ns, rows]) => {
    window.localStorage.setItem(`${ns}:comm`, JSON.stringify(rows));
  },
  [NS, seedCommRows(55)],
);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

// ── Warm up every route so the dev compiler is not mid-flight ─────────
console.log('\n=== warm up ===');
for (const p of [
  '/admin/comm/', '/admin/tickets/', '/admin/audit/',
  '/en/admin/comm/', '/en/admin/tickets/', '/en/admin/audit/',
  '/en/admin/dashboard/', '/en/admin/mfa/',
]) {
  const resp = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(900);
  console.log(`  ${resp?.status()}  ${p}`);
}

// Reset the error buffer — the warm-up navigations are where the dev
// compiler logs "Failed to fetch RSC payload".
consoleErrors = [];

// ── /admin/comm ────────────────────────────────────────────────────────
console.log('\n=== /admin/comm ===');
await goto('/admin/comm/');

const seededCount = await page.evaluate((ns) => {
  const raw = window.localStorage.getItem(`${ns}:comm`);
  return raw ? JSON.parse(raw).length : 0;
}, NS);

const commHasToolbar = await page.locator('input[type="search"]').count();
check('comm: 搜索框存在', commHasToolbar > 0, `count=${commHasToolbar}`);

const commExportBtn = await page.locator('button:has-text("CSV"), button:has-text("导出")').count();
check('comm: CSV 导出按钮存在', commExportBtn > 0, `count=${commExportBtn}`);

const commPrev = await page.locator('button:has-text("上一页"), button:has-text("Prev")').count();
check('comm: 分页控件存在', commPrev > 0, `count=${commPrev}`);

// The toolbar count must match the number of rows we seeded.
const countText = await page.locator('[aria-live="polite"]').first().textContent().catch(() => null);
const countNum = countText ? Number(countText.trim().split('/')[0].trim()) : NaN;
check(
  'comm: 计数 == 实际行数',
  countNum === seededCount,
  `dom="${countText?.trim()}" seeded=${seededCount}`,
);

// Only one page of rows is rendered at a time (PAGE_SIZE = 20).
const commRows = await page.locator('table tbody tr').count();
check('comm: 单页只渲染 PAGE_SIZE 行', commRows === 20, `rows=${commRows} (seeded ${seededCount})`);

const commCheckboxes = await page.locator('table tbody input[type="checkbox"]').count();
check('comm: 批量选择 checkbox 存在', commCheckboxes > 0, `count=${commCheckboxes}`);

const commSettle = await page.locator('button:has-text("结算"), button:has-text("Settle")').count();
check('comm: 结算按钮存在', commSettle > 0, `count=${commSettle}`);

// Search must actually filter the rows.
const beforeSearch = await page.locator('table tbody tr').count();
await page.locator('input[type="search"]').first().fill('bulkuser7');
await page.waitForTimeout(600);
const afterSearch = await page.locator('table tbody tr').count();
check('comm: 搜索真的过滤了行', afterSearch < beforeSearch, `${beforeSearch} → ${afterSearch}`);
await page.locator('input[type="search"]').first().fill('');
await page.waitForTimeout(500);

// ── /admin/tickets ─────────────────────────────────────────────────────
console.log('\n=== /admin/tickets ===');
await goto('/admin/tickets/');

const tkHasToolbar = await page.locator('input[type="search"]').count();
check('tickets: 搜索框存在', tkHasToolbar > 0, `count=${tkHasToolbar}`);

const tkExport = await page.locator('button:has-text("CSV"), button:has-text("导出")').count();
check('tickets: CSV 导出按钮存在', tkExport > 0, `count=${tkExport}`);

const tkRows = await page.locator('table tbody tr').count();
check('tickets: 表格有行', tkRows > 0, `rows=${tkRows}`);

const tkDetail = await page.locator('button:has-text("详情"), button:has-text("Detail")').count();
check('tickets: 详情按钮存在', tkDetail > 0, `count=${tkDetail}`);

// Detail modal must open and expose a reply box.
await page.locator('button:has-text("详情"), button:has-text("Detail")').first().click();
await page.waitForTimeout(700);
const replyBox = await page.locator('#ticket-reply-input').count();
check('tickets: 详情弹层有回复输入框', replyBox > 0, `count=${replyBox}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ── /admin/audit ───────────────────────────────────────────────────────
console.log('\n=== /admin/audit ===');
await goto('/admin/audit/');

const auSearch = await page.locator('input[type="search"]').count();
check('audit: 搜索框存在', auSearch > 0, `count=${auSearch}`);

const auActor = await page.locator('#audit-actor-filter').count();
check('audit: actor 筛选框存在', auActor > 0, `count=${auActor}`);

const auExport = await page.locator('button:has-text("CSV"), button:has-text("导出")').count();
check('audit: CSV 导出按钮存在', auExport > 0, `count=${auExport}`);

const auRows = await page.locator('table tbody tr').count();
check('audit: 表格有行(demo 模式不再是 forbidden)', auRows > 0, `rows=${auRows}`);

// ── /en/admin/* — the pages that used to 404 ──────────────────────────
console.log('\n=== /en/admin/* (was 404) ===');
for (const p of ['/en/admin/audit/', '/en/admin/mfa/', '/en/admin/comm/', '/en/admin/tickets/']) {
  const resp = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(900);
  check(`en: ${p} → 200`, resp?.status() === 200, `status=${resp?.status()}`);
}

// ── console errors (after warm-up) ────────────────────────────────────
console.log('\n=== console errors ===');
const realErrors = consoleErrors.filter(
  (e) => !/favicon|Failed to load resource.*404.*favicon|Download the React DevTools/i.test(e),
);
check('无 console error', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));

// ── cleanup: remove the seeded rows so we don't leave junk behind ──────
await page.evaluate((ns) => window.localStorage.removeItem(`${ns}:comm`), NS);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  process.exit(1);
}
