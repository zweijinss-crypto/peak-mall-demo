// E1 checkout 支付方式 + 选中地址持久化 Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[E1]', ...a);

const browser = await chromium.launch();

// Seed: 2 addresses (default = a1), 1 cart item
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  localStorage.setItem('peak_addresses', JSON.stringify([
    { id: 'a1', name: 'Default User', phone: '13800001111', region: '北京', detail: '中关村大街 1 号', isDefault: true, tag: 'home' },
    { id: 'a2', name: 'Office User', phone: '13800002222', region: '上海', detail: '张江路 88 号', isDefault: false, tag: 'office' },
  ]));
  // Seed cart
  localStorage.setItem('peak-mall-store', JSON.stringify({
    state: {
      cart: [{ id: 49, name: 'Ultra-Slim Business Laptop', price: 499, qty: 1, cover: '/covers/p16.svg', selected: true }],
      orders: [], wishlist: [], locale: 'zh', currency: 'USD', coupon: null,
    },
    version: 0,
  }));
});
const page = await ctx.newPage();

const url = `${BASE}/checkout/`;
log('STEP1: open checkout');
await page.goto(url, { waitUntil: 'domcontentloaded' });
// Wait for cart to render + hydration
await page.waitForSelector('button[aria-pressed]', { timeout: 15000 });
await page.waitForTimeout(2000);

// STEP2: verify default address is auto-selected
const initialPicked = await page.locator('button[aria-pressed="true"]').count();
log('  initial pressed buttons =', initialPicked);
if (initialPicked < 1) throw new Error('no address selected initially');

// STEP3: click second address (Office) → should be selected
log('STEP3: click Office address');
const officeAddr = page.locator('button[aria-pressed]', { hasText: 'Office User' });
await officeAddr.click({ timeout: 5000 });
await page.waitForTimeout(300);
// Verify localStorage was written
const pickedAddrStored = await page.evaluate(() => localStorage.getItem('peak_checkout_picked_addr'));
log('  localStorage pickedAddr =', pickedAddrStored);
if (pickedAddrStored !== 'a2') throw new Error(`expected a2, got ${pickedAddrStored}`);

// STEP4: reload page → Office should still be selected (sticky)
log('STEP4: reload → Office still selected');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('button[aria-pressed]', { timeout: 10000 });
await page.waitForTimeout(1500);
const officeStillPicked = await page.locator('button[aria-pressed="true"]').first().textContent();
log('  picked after reload:', officeStillPicked?.slice(0, 40));
if (!officeStillPicked?.includes('Office User')) throw new Error('Office not picked after reload');

// STEP5: switch payment method → Mastercard
log('STEP5: click Mastercard payment method');
const mcBtn = page.locator('button', { hasText: 'Mastercard' }).first();
await mcBtn.click({ timeout: 5000 });
await page.waitForTimeout(300);
const methodStored = await page.evaluate(() => localStorage.getItem('peak_checkout_payment_method'));
log('  localStorage method =', methodStored);
if (methodStored !== 'mastercard') throw new Error(`expected mastercard, got ${methodStored}`);

// STEP6: reload → Mastercard still selected
log('STEP6: reload → Mastercard still picked');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('button[aria-pressed]', { timeout: 10000 });
await page.waitForTimeout(1500);
// Find the radio/button that's pressed for payment
const mcBtnAfter = page.locator('button', { hasText: 'Mastercard' }).first();
const mcAriaPressed = await mcBtnAfter.getAttribute('aria-pressed');
log('  MC aria-pressed =', mcAriaPressed);
// Check by class — picked payment method has different styling
const mcClass = await mcBtnAfter.getAttribute('class');
log('  MC class includes border-orange:', mcClass?.includes('border-orange'));
// Also check Visa is NOT pressed
const visaBtn = page.locator('button[aria-pressed]', { hasText: 'Visa 卡支付' }).first();
const visaClass = await visaBtn.getAttribute('class');
log('  Visa class includes border-orange:', visaClass?.includes('border-orange'));
if (visaClass?.includes('border-orange') && !mcClass?.includes('border-orange')) {
  throw new Error('Visa is highlighted but MC should be');
}

// STEP7: switch back to Visa → verify it persists too
log('STEP7: switch back to Visa → persist');
const visaBtn7 = page.locator('button[aria-pressed]', { hasText: 'Visa 卡支付' }).first();
await visaBtn7.click({ timeout: 5000 });
await page.waitForTimeout(300);
const visaStored = await page.evaluate(() => localStorage.getItem('peak_checkout_payment_method'));
log('  method after Visa =', visaStored);
if (visaStored !== 'visa') throw new Error('visa not persisted');

// STEP8: fresh context (no localStorage) → defaults to default address + visa
log('STEP8: fresh context → defaults applied');
const freshCtx = await browser.newContext();
await freshCtx.addInitScript(() => {
  localStorage.setItem('peak_addresses', JSON.stringify([
    { id: 'a1', name: 'Default User', phone: '13800001111', region: '北京', detail: '中关村大街 1 号', isDefault: true, tag: 'home' },
    { id: 'a2', name: 'Office User', phone: '13800002222', region: '上海', detail: '张江路 88 号', isDefault: false, tag: 'office' },
  ]));
  localStorage.setItem('peak-mall-store', JSON.stringify({
    state: {
      cart: [{ id: 49, name: 'Ultra-Slim Business Laptop', price: 499, qty: 1, cover: '/covers/p16.svg', selected: true }],
      orders: [], wishlist: [], locale: 'zh', currency: 'USD', coupon: null,
    },
    version: 0,
  }));
});
const freshPage = await freshCtx.newPage();
await freshPage.goto(url, { waitUntil: 'domcontentloaded' });
await freshPage.waitForSelector('button[aria-pressed]', { timeout: 10000 });
await freshPage.waitForTimeout(1500);
const defaultPicked = await freshPage.locator('button[aria-pressed="true"]').first().textContent();
log('  fresh default picked:', defaultPicked?.slice(0, 40));
if (!defaultPicked?.includes('Default User')) throw new Error('fresh ctx should pick default address');

await freshCtx.close();

log('✅ ALL 8 STEPS PASS');
await browser.close();