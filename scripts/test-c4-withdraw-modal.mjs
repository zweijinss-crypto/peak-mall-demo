// C4 withdraw 详情 modal Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[C4]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
await ctx.addInitScript(() => {
  localStorage.setItem('peak_withdraw_addresses', JSON.stringify([
    { id: 'A1', label: 'USDT-TRC20-default', type: 'crypto', isDefault: true, address: 'TAbcDefGhiJklMnoPqrStuVwxYz012345' },
  ]));
});
const page = await ctx.newPage();

const url = `${BASE}/withdraw/`;
log('STEP1: open', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[role="tablist"]', { timeout: 15000 });
await page.waitForTimeout(1500); // hydration

// STEP2: count rows
const initialArticles = await page.locator('.space-y-3 article').count();
log('  history articles =', initialArticles);
if (initialArticles < 7) throw new Error(`expected >= 7 articles, got ${initialArticles}`);

// STEP3: click first row → modal opens
log('STEP3: click first row');
await page.locator('.space-y-3 article').first().click({ force: true });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
log('  modal opened ✓');

// STEP4: verify modal labels
const modalText = await page.locator('[role="dialog"]').textContent();
const labels = ['提现金额', '网络手续费', '实际到账', '提现地址', '时间线', '已提交'];
for (const label of labels) {
  const has = modalText?.includes(label);
  log(`  modal has "${label}":`, has);
  if (!has) throw new Error(`modal missing "${label}"`);
}

// STEP5: net amount visible (calcFee on $100 → fee = $2 → net $98)
const netVisible = modalText?.includes('$98.00');
log('  net $98.00 visible:', netVisible);
if (!netVisible) throw new Error('net amount $98.00 missing');

// STEP6: timeline has 已提交 row
const timelineRows = await page.locator('[role="dialog"] ol li').count();
log('  timeline rows =', timelineRows);
if (timelineRows < 1) throw new Error('timeline empty');

// STEP7: copy address button
const copyBtn = await page.locator('[role="dialog"] button', { hasText: '复制地址' }).count();
log('  copy button:', copyBtn > 0);
if (copyBtn < 1) throw new Error('copy button missing');

// STEP8: click copy → toast
log('STEP8: click 复制地址 → toast');
await page.locator('[role="dialog"] button', { hasText: '复制地址' }).click({ force: true });
await page.waitForTimeout(400);
const copyToast = await page.locator('[role="status"]', { hasText: '地址已复制' }).count();
log('  copy toast:', copyToast > 0);
if (copyToast < 1) throw new Error('copy toast missing');

// STEP9: ✕ close
log('STEP9: ✕ closes modal');
await page.locator('[role="dialog"] button[aria-label="关闭"]').click({ force: true });
await page.waitForTimeout(300);
const modalAfter = await page.locator('[role="dialog"]').count();
if (modalAfter !== 0) throw new Error('✕ did not close modal');

// STEP10: click rejected row (W3 has rejectReason) → modal shows reject reason
log('STEP10: click W3 (rejected) → reject reason shown');
// Use the article containing W3
const w3Article = page.locator('.space-y-3 article', { hasText: 'W3' });
await w3Article.click({ force: true });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
const rejectModal = await page.locator('[role="dialog"]').textContent();
log('  has 拒绝原因:', rejectModal?.includes('拒绝原因'));
if (!rejectModal?.includes('拒绝原因')) throw new Error('rejected modal missing 拒绝原因');
log('  has reason detail:', rejectModal?.includes('Bank account'));
if (!rejectModal?.includes('Bank account')) throw new Error('rejected modal missing reason text');

// STEP11: rejected timeline has 已拒绝 row
const rejectedTimeline = await page.locator('[role="dialog"] ol li').count();
log('  rejected timeline rows =', rejectedTimeline);
if (rejectedTimeline < 2) throw new Error('rejected timeline should have 提交 + 拒绝');

// STEP12: completed row (W1) shows full timeline (3 rows: 提交 + 批准 + 完成)
log('STEP12: click W1 (completed) → 3 timeline rows');
await page.locator('[role="dialog"] button[aria-label="关闭"]').click({ force: true });
await page.waitForTimeout(300);
const w1Article = page.locator('.space-y-3 article', { hasText: 'W1' });
await w1Article.click({ force: true });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
const completedTimeline = await page.locator('[role="dialog"] ol li').count();
log('  completed timeline rows =', completedTimeline);
if (completedTimeline !== 3) throw new Error(`completed timeline expected 3, got ${completedTimeline}`);

// STEP13: backdrop click closes modal
log('STEP13: backdrop click closes');
await page.locator('[role="dialog"]').click({ position: { x: 5, y: 5 } });
await page.waitForTimeout(300);
const afterBackdrop = await page.locator('[role="dialog"]').count();
if (afterBackdrop !== 0) throw new Error('backdrop click did not close');

log('✅ ALL 13 STEPS PASS');
await browser.close();