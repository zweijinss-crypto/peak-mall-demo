// B8 commission 单笔导出 Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'fs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[B8]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
const page = await ctx.newPage();

const url = `${BASE}/commissions/`;
log('STEP1: open', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('table tbody tr', { timeout: 15000 });
// hydration: row must have onClick
await page.waitForFunction(() => {
  const tr = document.querySelector('table tbody tr');
  if (!tr) return false;
  const k = Object.keys(tr).find((x) => x.startsWith('__reactProps'));
  return !!k && typeof tr[k].onClick === 'function';
}, { timeout: 10000 });

// STEP2: click first row → modal opens
log('STEP2: click first row');
await page.locator('table tbody tr').first().click({ force: true, timeout: 5000 });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

// STEP3: verify exportRow button visible with new text
const exportBtnCount = await page.locator(`[role="dialog"] button`, { hasText: '导出这笔' }).count();
log('  exportRow button:', exportBtnCount > 0);
if (exportBtnCount < 1) throw new Error('exportRow button missing in modal');

// STEP4: click exportRow → download
log('STEP4: click 导出这笔 → download');
const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
await page.locator(`[role="dialog"] button`, { hasText: '导出这笔' }).click({ timeout: 5000 });
const download = await downloadPromise;
const filename = download.suggestedFilename();
log('  filename =', filename);
if (!filename.startsWith('commission-ORD-') || !filename.endsWith('.csv')) {
  throw new Error(`bad filename: ${filename}`);
}

// STEP5: csv content check — header + 1 data row
const path = await download.path();
const csv = readFileSync(path, 'utf8');
const lines = csv.split('\n').filter(Boolean);
log('  csv lines =', lines.length);
log('  header:', lines[0]);
log('  data:', lines[1]);
if (lines.length !== 2) throw new Error(`csv expected 2 lines (header + 1 row), got ${lines.length}`);
if (!lines[0].includes('订单') && !lines[0].includes('Order')) throw new Error('csv header missing Order column');
if (!lines[1].includes('ORD-')) throw new Error('data row missing ORD-*');

// STEP6: toast appears
const toast = await page.locator('[role="status"]', { hasText: '单笔已导出' }).count();
log('  toast:', toast > 0);
if (toast < 1) throw new Error('row export toast missing');

// STEP7: modal still open after export
const modalAfter = await page.locator('[role="dialog"]').count();
log('  modal still open:', modalAfter);
if (modalAfter !== 1) throw new Error('modal closed after export (should stay open)');

// STEP8: click second row, modal updates, export downloads second row
log('STEP8: click second row → export that row');
await page.locator(`[role="dialog"] button[aria-label="关闭"]`).click({ timeout: 5000 });
await page.waitForTimeout(300);
await page.locator('table tbody tr').nth(1).click({ force: true, timeout: 5000 });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
const secondOrderId = await page.locator('#commissionDetailTitle').textContent();
log('  second modal orderId:', secondOrderId);
const dl2Promise = page.waitForEvent('download', { timeout: 10000 });
await page.locator(`[role="dialog"] button`, { hasText: '导出这笔' }).click({ timeout: 5000 });
const dl2 = await dl2Promise;
const fn2 = dl2.suggestedFilename();
log('  second filename =', fn2);
if (!fn2.includes(secondOrderId)) throw new Error(`second filename ${fn2} should contain ${secondOrderId}`);
const csv2 = readFileSync(await dl2.path(), 'utf8');
const lines2 = csv2.split('\n').filter(Boolean);
if (lines2.length !== 2) throw new Error(`second csv expected 2 lines, got ${lines2.length}`);
if (!lines2[1].includes(secondOrderId)) throw new Error(`second csv row missing orderId ${secondOrderId}`);

log('✅ ALL 8 STEPS PASS');
await browser.close();