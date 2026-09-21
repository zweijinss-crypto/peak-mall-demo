// F1 team 成员详情 modal Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[F1]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await ctx.newPage();

const url = `${BASE}/team/`;
log('STEP1: open team page');
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('table tbody tr', { timeout: 15000 });
await page.waitForTimeout(1500);

// STEP2: rows count
const rowCount = await page.locator('table tbody tr').count();
log('  rows =', rowCount);
if (rowCount < 5) throw new Error(`expected >= 5 rows, got ${rowCount}`);

// STEP3: click first row → modal opens
log('STEP3: click first row');
await page.locator('table tbody tr').first().click({ force: true, timeout: 5000 });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
log('  modal opened ✓');

// STEP4: modal structure check
const modalText = await page.locator('[role="dialog"]').textContent();
const requiredLabels = ['成员详情', '加入时间', '贡献订单', '贡献佣金', '平均订单金额', '最近佣金记录'];
for (const label of requiredLabels) {
  const has = modalText?.includes(label);
  log(`  has "${label}":`, has);
  if (!has) throw new Error(`modal missing "${label}"`);
}

// STEP5: level badge present (L1 for first row)
const levelBadge = modalText?.match(/L[123]/);
log('  level badge:', levelBadge?.[0]);
if (!levelBadge) throw new Error('level badge missing');

// STEP6: commission shows $68.40 for first member (莉莉)
const commission = modalText?.includes('$68.40');
log('  commission $68.40:', commission);
if (!commission) throw new Error('commission amount missing');

// STEP7: recent commissions list (莉莉 has 3)
const recentRows = await page.locator('[role="dialog"] ul li').count();
log('  recent rows =', recentRows);
if (recentRows < 3) throw new Error(`expected 3 recent rows, got ${recentRows}`);

// STEP8: copy invite link → toast
log('STEP8: copy invite link');
await page.locator('[role="dialog"] button', { hasText: '复制专属邀请链接' }).click({ timeout: 5000 });
await page.waitForTimeout(400);
const linkToast = await page.locator('[role="status"]', { hasText: '邀请链接已复制' }).count();
log('  link toast:', linkToast > 0);
if (linkToast < 1) throw new Error('link toast missing');
// Verify clipboard contains ref=M1
const clipText = await page.evaluate(() => navigator.clipboard.readText());
log('  clipboard:', clipText);
if (!clipText.includes('ref=M1')) throw new Error('clipboard missing ref=M1');
if (!clipText.includes('invite=PEAK-DEMO-7F3K')) throw new Error('clipboard missing invite code');

// STEP9: ✕ close
log('STEP9: ✕ close');
await page.locator('[role="dialog"] button[aria-label="关闭"]').click({ force: true });
await page.waitForTimeout(300);
const after = await page.locator('[role="dialog"]').count();
if (after !== 0) throw new Error('✕ did not close');

// STEP10: click 3rd row (小张 L2 with 2 recent)
log('STEP10: click 3rd row (小张 L2)');
await page.locator('table tbody tr').nth(2).click({ force: true });
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
const m3Text = await page.locator('[role="dialog"]').textContent();
log('  has 小张:', m3Text?.includes('小张'));
if (!m3Text?.includes('小张')) throw new Error('3rd row modal did not show 小张');
log('  has L2:', m3Text?.includes('L2'));
if (!m3Text?.includes('L2')) throw new Error('L2 badge missing');
const m3Recent = await page.locator('[role="dialog"] ul li').count();
log('  3rd row recent rows =', m3Recent);
if (m3Recent !== 2) throw new Error(`小张 should have 2 recent, got ${m3Recent}`);

// STEP11: backdrop click closes
log('STEP11: backdrop close');
await page.locator('[role="dialog"]').click({ position: { x: 5, y: 5 } });
await page.waitForTimeout(300);
const afterBackdrop = await page.locator('[role="dialog"]').count();
if (afterBackdrop !== 0) throw new Error('backdrop did not close');

// STEP12: invite copy button (top section) still works alongside modal
log('STEP12: invite copy button still works');
await page.locator('button', { hasText: '复制' }).first().click({ timeout: 5000 });
await page.waitForTimeout(400);
const inviteToast = await page.locator('[role="status"]', { hasText: '已复制' }).count();
log('  invite copy toast:', inviteToast > 0);
if (inviteToast < 1) throw new Error('invite copy toast missing');

log('✅ ALL 12 STEPS PASS');
await browser.close();