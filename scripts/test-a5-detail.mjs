// A5 orders 详情查看 Playwright 测试
// 关键: fresh browser context localStorage 是空的 → store orders=[] → 页面渲染 empty state
// 修法: 用 addInitScript 在 page load 之前把 demo orders seed 到 localStorage
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'fs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[A5]', ...a);

const SEED_ZH = JSON.parse(readFileSync('/tmp/seed-zh.json', 'utf8'));
const SEED_EN = JSON.parse(readFileSync('/tmp/seed-en.json', 'utf8'));

const browser = await chromium.launch();

// ============== zh 测试 ==============
log('=== zh 测试 ===');
const zhCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await zhCtx.addInitScript((seed) => {
  localStorage.setItem('peak-mall-store', JSON.stringify(seed));
}, SEED_ZH);
const zhPage = await zhCtx.newPage();

// STEP1: 打开 /orders/ zh + 等 hydration
log('STEP1: open /orders/ zh');
await zhPage.goto(`${BASE}/orders/`, { waitUntil: 'domcontentloaded' });
await zhPage.waitForSelector('article', { timeout: 15000 });
const zhArticleCount = await zhPage.locator('article').count();
log('  articles =', zhArticleCount);
if (zhArticleCount < 1) throw new Error('zh: no orders rendered');

// STEP2: 点查看详情 → panel 打开
log('STEP2: click 查看详情');
const zhViewBtn = zhPage.locator('button', { hasText: '查看详情' }).first();
await zhViewBtn.scrollIntoViewIfNeeded();
await zhViewBtn.click({ timeout: 5000 });
await zhPage.waitForSelector('section[aria-label="查看详情"]', { timeout: 5000 });
log('  panel opened ✓');

// STEP3: 验证 panel 内部关键文本
const zhPanelText = await zhPage.locator('section[aria-label="查看详情"]').textContent();
const zhHasPayment = zhPanelText?.includes('支付方式');
const zhHasTimeline = zhPanelText?.includes('订单时间线');
log('  panel has 支付方式:', zhHasPayment);
log('  panel has 订单时间线:', zhHasTimeline);
if (!zhHasPayment) throw new Error('zh: panel missing 支付方式');
if (!zhHasTimeline) throw new Error('zh: panel missing 订单时间线');

// STEP4: timeline 行数 ≥ 4 (下单/支付/发货/签收)
const zhTimelineRows = await zhPage.locator('section[aria-label="查看详情"] ol li').count();
log('  timeline rows =', zhTimelineRows);
if (zhTimelineRows < 4) throw new Error(`zh: timeline rows = ${zhTimelineRows}, expected >= 4`);

// STEP5: 按钮文字切到「收起详情」
const zhHideBtnCount = await zhPage.locator('button', { hasText: '收起详情' }).count();
log('  button switched to 收起详情:', zhHideBtnCount > 0);
if (zhHideBtnCount < 1) throw new Error('zh: button did not switch to 收起详情');

// STEP6: 点收起 → panel 关闭
log('STEP6: click 收起详情 → panel closes');
await zhPage.locator('button', { hasText: '收起详情' }).first().click({ timeout: 5000 });
await zhPage.waitForTimeout(300);
const zhPanelAfter = await zhPage.locator('section[aria-label="查看详情"]').count();
log('  panels after collapse =', zhPanelAfter);
if (zhPanelAfter !== 0) throw new Error('zh: panel did not collapse');

// STEP7: 按钮恢复「查看详情 →」
const zhViewBackCount = await zhPage.locator('button', { hasText: '查看详情' }).count();
log('  button restored:', zhViewBackCount > 0);
if (zhViewBackCount < 1) throw new Error('zh: button did not restore');

await zhCtx.close();

// ============== en 测试 ==============
log('=== en 测试 ===');
const enCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await enCtx.addInitScript((seed) => {
  localStorage.setItem('peak-mall-store', JSON.stringify(seed));
}, SEED_EN);
const enPage = await enCtx.newPage();

log('STEP1: open /en/orders/');
await enPage.goto(`${BASE}/en/orders/`, { waitUntil: 'domcontentloaded' });
await enPage.waitForSelector('article', { timeout: 15000 });
const enArticleCount = await enPage.locator('article').count();
log('  articles =', enArticleCount);
if (enArticleCount < 1) throw new Error('en: no orders rendered');

log('STEP2: click View detail');
const enViewBtn = enPage.locator('button', { hasText: 'View detail' }).first();
await enViewBtn.scrollIntoViewIfNeeded();
await enViewBtn.click({ timeout: 5000 });
await enPage.waitForSelector('section[aria-label="View detail"]', { timeout: 5000 });
log('  panel opened ✓');

const enPanelText = await enPage.locator('section[aria-label="View detail"]').textContent();
const enHasPayment = enPanelText?.includes('Payment');
const enHasTimeline = enPanelText?.includes('Timeline');
log('  panel has Payment:', enHasPayment);
log('  panel has Timeline:', enHasTimeline);
if (!enHasPayment) throw new Error('en: panel missing Payment');
if (!enHasTimeline) throw new Error('en: panel missing Timeline');

const enTimelineRows = await enPage.locator('section[aria-label="View detail"] ol li').count();
log('  timeline rows =', enTimelineRows);
if (enTimelineRows < 4) throw new Error(`en: timeline rows = ${enTimelineRows}, expected >= 4`);

const enHideBtnCount = await enPage.locator('button', { hasText: 'Hide details' }).count();
log('  button switched to Hide details:', enHideBtnCount > 0);
if (enHideBtnCount < 1) throw new Error('en: button did not switch to Hide details');

log('STEP: click Hide details → panel closes');
await enPage.locator('button', { hasText: 'Hide details' }).first().click({ timeout: 5000 });
await enPage.waitForTimeout(300);
const enPanelAfter = await enPage.locator('section[aria-label="View detail"]').count();
if (enPanelAfter !== 0) throw new Error('en: panel did not collapse');

await enCtx.close();

log('✅ ALL STEPS PASS (zh + en, 7 + 6 steps)');
await browser.close();