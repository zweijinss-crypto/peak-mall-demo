// C3 withdraw history filter + CSV export Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[C3]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
await ctx.addInitScript(() => {
  localStorage.setItem('peak_withdraw_addresses', JSON.stringify([
    { id: 'A1', label: 'USDT-TRC20-default', type: 'crypto', isDefault: true, address: 'TAbcDefGhiJklMnoPqrStuVwxYz012345' },
  ]));
});
const page = await ctx.newPage();

const isZh = true;
const url = `${BASE}/withdraw/`;

log('STEP1: open', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
// Wait for hydration — history article has no onClick so wait for tab list (which uses onClick)
await page.waitForSelector('[role="tablist"]', { timeout: 15000 });
await page.waitForFunction(() => {
  const tab = document.querySelector('[role="tablist"] button');
  if (!tab) return false;
  const k = Object.keys(tab).find((x) => x.startsWith('__reactProps'));
  return !!k && typeof tab[k].onClick === 'function';
}, { timeout: 10000 });

// STEP2: count history rows initially
const initialCount = await page.locator('section.bg-white.border-ink-100 article, .space-y-3 article').count();
log('  initial history rows =', initialCount);
if (initialCount < 7) throw new Error(`expected >= 7 rows, got ${initialCount}`);

// STEP3: status tabs present
const tabLabels = ['全部', '处理中', '已批准', '已拒绝', '已完成'];
for (const label of tabLabels) {
  const has = await page.locator(`[role="tab"]`, { hasText: label }).count();
  log(`  tab "${label}":`, has > 0);
  if (has < 1) throw new Error(`missing tab "${label}"`);
}

// STEP4: click 已完成 tab → 3 rows
log('STEP4: click 已完成 tab');
await page.locator(`[role="tab"]`, { hasText: '已完成' }).first().click({ force: true });
await page.waitForTimeout(300);
const completedRows = await page.locator('.space-y-3 article').count();
log('  completed rows =', completedRows);
if (completedRows !== 3) throw new Error(`completed expected 3, got ${completedRows}`);

// STEP5: click 待处理 (处理中) tab → 1 row
log('STEP5: click 处理中 tab');
await page.locator(`[role="tab"]`, { hasText: '处理中' }).first().click({ force: true });
await page.waitForTimeout(300);
const pendingRows = await page.locator('.space-y-3 article').count();
log('  pending rows =', pendingRows);
if (pendingRows !== 1) throw new Error(`pending expected 1, got ${pendingRows}`);

// STEP6: search filter
log('STEP6: search "Bank" → 2 rows');
await page.locator(`[role="tab"]`, { hasText: '全部' }).first().click({ force: true });
await page.waitForTimeout(200);
// Use specific placeholder to avoid header global search input
await page.locator('input[placeholder="搜索 id / 地址"]').first().fill('Bank');
await page.waitForTimeout(300);
const searchRows = await page.locator('.space-y-3 article').count();
log('  search rows =', searchRows);
if (searchRows !== 2) throw new Error(`search Bank expected 2, got ${searchRows}`);

// STEP7: clear search
await page.locator('input[placeholder="搜索 id / 地址"]').first().fill('');
await page.waitForTimeout(200);
const allRows = await page.locator('.space-y-3 article').count();
log('  rows after clear =', allRows);
if (allRows < 7) throw new Error(`after clear expected >= 7, got ${allRows}`);

// STEP8: noMatch state — search for nonsense
log('STEP8: search "XYZ123" → noMatch');
await page.locator('input[placeholder="搜索 id / 地址"]').first().fill('XYZ123');
await page.waitForTimeout(300);
const noMatchCount = await page.locator('.space-y-3 article').count();
const noMatchBanner = await page.locator('text=没有匹配的记录').count();
log('  rows =', noMatchCount, 'noMatch banner =', noMatchBanner);
if (noMatchCount !== 0) throw new Error('rows should be 0');
if (noMatchBanner < 1) throw new Error('noMatch banner missing');
await page.locator('input[placeholder="搜索 id / 地址"]').first().fill('');

// STEP9: CSV export download
log('STEP9: click 导出 CSV → download');
const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
await page.locator('button', { hasText: '导出 CSV' }).first().click({ force: true });
const download = await downloadPromise;
const filename = download.suggestedFilename();
log('  filename =', filename);
if (!filename.startsWith('withdrawals-') || !filename.endsWith('.csv')) {
  throw new Error(`bad filename: ${filename}`);
}

// STEP10: download content check
const path = await download.path();
const fs = await import('fs');
const csv = fs.readFileSync(path, 'utf8');
const lines = csv.split('\n').filter(Boolean);
log('  csv lines =', lines.length);
log('  header:', lines[0]);
if (!lines[0].includes('提现地址')) throw new Error('csv header missing 提现地址');
if (lines.length < 8) throw new Error(`csv expected >= 8 lines (header + 7 rows), got ${lines.length}`);

// STEP11: toast appears after export
const toast = await page.locator('[role="status"]', { hasText: '已导出' }).count();
log('  toast:', toast > 0);
if (toast < 1) throw new Error('export toast missing');

// STEP12: filter then export → csv contains only filtered rows
log('STEP12: 已完成 tab + export → 3 data rows');
await page.locator(`[role="tab"]`, { hasText: '已完成' }).first().click({ force: true });
await page.waitForTimeout(300);
const download2Promise = page.waitForEvent('download', { timeout: 10000 });
await page.locator('button', { hasText: '导出 CSV' }).first().click({ force: true });
const dl2 = await download2Promise;
const csv2 = fs.readFileSync(await dl2.path(), 'utf8');
const lines2 = csv2.split('\n').filter(Boolean);
log('  completed csv lines =', lines2.length);
if (lines2.length !== 4) throw new Error(`completed csv expected 4 lines (header + 3 rows), got ${lines2.length}`);

// STEP13: rejected row shows reject reason
log('STEP13: 已拒绝 tab shows reject reason');
await page.locator(`[role="tab"]`, { hasText: '已拒绝' }).first().click({ force: true });
await page.waitForTimeout(300);
const rejectReasons = await page.locator('.space-y-3 article').count();
log('  rejected rows =', rejectReasons);
if (rejectReasons !== 2) throw new Error(`rejected expected 2, got ${rejectReasons}`);
const reasons = await page.locator('.space-y-3 article').first().textContent();
const hasReason = reasons?.includes('⚠');
log('  first rejected has reason emoji:', hasReason);
if (!hasReason) throw new Error('rejected row missing reason');

log('✅ ALL 13 STEPS PASS');
await browser.close();