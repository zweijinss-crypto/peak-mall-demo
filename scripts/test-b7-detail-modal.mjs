// B7 commissions 详情 modal Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[B7]', ...a);

const browser = await chromium.launch();

async function runTest(locale) {
  log(`=== ${locale} 测试 ===`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // locale switch via init script
  await ctx.addInitScript((loc) => {
    const KEY = 'peak-mall-store';
    let prev = null;
    try { prev = localStorage.getItem(KEY); } catch {}
    let parsed = { state: { locale: 'zh', currency: 'USD' }, version: 0 };
    try { if (prev) parsed = JSON.parse(prev); } catch {}
    parsed.state = { ...(parsed.state ?? {}), locale: loc, currency: 'USD' };
    localStorage.setItem(KEY, JSON.stringify(parsed));
  }, locale);

  const url = locale === 'zh' ? `${BASE}/commissions/` : `${BASE}/en/commissions/`;
  const isZh = locale === 'zh';

  // STEP1: open + wait for table rows + hydration
  log('STEP1: open', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  // Wait for React hydration: row must have __reactProps with onClick
  await page.waitForFunction(() => {
    const tr = document.querySelector('table tbody tr');
    if (!tr) return false;
    const k = Object.keys(tr).find((x) => x.startsWith('__reactProps'));
    return !!k && typeof tr[k].onClick === 'function';
  }, { timeout: 10000 });
  const rowCount = await page.locator('table tbody tr').count();
  log('  table rows =', rowCount);
  if (rowCount < 8) throw new Error(`${locale}: expected >= 8 rows, got ${rowCount}`);

  // STEP2: click first row → modal opens
  log('STEP2: click first row → modal opens');
  await page.locator('table tbody tr').first().click({ force: true, timeout: 5000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  log('  modal opened ✓');

  // STEP3: verify modal structure
  const title = isZh ? '佣金详情' : 'Commission detail';
  const titleCount = await page.locator(`#commissionDetailTitle`).count();
  log('  detailTitle exists:', titleCount === 1);
  if (titleCount !== 1) throw new Error(`${locale}: missing title element`);

  // STEP4: verify all B7 keys render
  const modalText = await page.locator('[role="dialog"]').textContent();
  const labels = isZh
    ? ['订单金额', '佣金比例', '佣金金额', '来源信息', '推广人', '层级']
    : ['Order amount', 'Commission rate', 'Commission amount', 'Source info', 'Referred by', 'Tier'];
  for (const label of labels) {
    const has = modalText?.includes(label);
    log(`  modal has "${label}":`, has);
    if (!has) throw new Error(`${locale}: modal missing label "${label}"`);
  }

  // STEP5: status badge (settled/pending) shows
  const hasStatusBadge = modalText?.includes(isZh ? '已结算' : 'Settled') || modalText?.includes(isZh ? '待结算' : 'Pending');
  log('  has status badge:', hasStatusBadge);
  if (!hasStatusBadge) throw new Error(`${locale}: modal missing status badge`);

  // STEP6: view order button present
  const viewOrderBtn = await page.locator(`[role="dialog"] a`, { hasText: isZh ? '查看订单' : 'View order' }).count();
  log('  view order button:', viewOrderBtn > 0);
  if (viewOrderBtn < 1) throw new Error(`${locale}: missing view order button`);

  // STEP7: close button (✕) closes modal
  log('STEP7: click ✕ closes modal');
  await page.locator(`[role="dialog"] button[aria-label="${isZh ? '关闭' : 'Close'}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(300);
  const modalAfter = await page.locator('[role="dialog"]').count();
  log('  modals after close:', modalAfter);
  if (modalAfter !== 0) throw new Error(`${locale}: ✕ button did not close modal`);

  // STEP8: click second row → different content (modal updates)
  log('STEP8: click second row → modal opens with different content');
  const secondOrderId = await page.locator('table tbody tr').nth(1).locator('td').first().textContent();
  await page.locator('table tbody tr').nth(1).click({ force: true, timeout: 5000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const titleText2 = await page.locator('#commissionDetailTitle').textContent();
  log(`  second row orderId in modal: ${titleText2} (was ${secondOrderId})`);
  if (!titleText2?.trim() || titleText2.trim() !== secondOrderId?.trim()) {
    throw new Error(`${locale}: modal didn't update to second row`);
  }

  // STEP9: backdrop click closes modal
  log('STEP9: backdrop click closes modal');
  await page.locator('[role="dialog"]').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);
  const modalAfterBackdrop = await page.locator('[role="dialog"]').count();
  if (modalAfterBackdrop !== 0) throw new Error(`${locale}: backdrop click did not close modal`);

  // STEP10: filter tab + click row works
  log('STEP10: click settled tab, then row opens modal');
  const settledTab = page.locator(`[role="tab"]`, { hasText: isZh ? '已结算' : 'Settled' });
  await settledTab.click();
  await page.waitForTimeout(200);
  const settledRows = await page.locator('table tbody tr').count();
  log('  settled rows =', settledRows);
  await page.locator('table tbody tr').first().click({ force: true, timeout: 5000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.locator(`[role="dialog"] button[aria-label="${isZh ? '关闭' : 'Close'}"]`).click();

  await ctx.close();
  log(`✅ ${locale} 10 steps PASS`);
}

await runTest('zh');
await runTest('en');

log('✅ ALL zh + en STEPS PASS');
await browser.close();