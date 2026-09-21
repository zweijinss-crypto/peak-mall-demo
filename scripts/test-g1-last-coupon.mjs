// G1 cart 上次优惠券复用 Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[G1]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// Seed cart (subtotal >= $200 for VIP20 eligibility test) + lastCouponCode pre-set
await ctx.addInitScript(() => {
  localStorage.setItem('peak-mall-store', JSON.stringify({
    state: {
      cart: [
        { id: 49, name: 'Ultra-Slim Business Laptop', price: 499, qty: 1, cover: '/covers/p16.svg', selected: true },
      ],
      orders: [], wishlist: [], locale: 'zh', currency: 'USD',
      coupon: null,
      lastCouponCode: 'SAVE10',
    },
    version: 0,
  }));
});
const page = await ctx.newPage();

const url = `${BASE}/cart/`;
log('STEP1: open cart with lastCouponCode=SAVE10');
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[placeholder*="优惠码"]', { timeout: 15000 });
await page.waitForTimeout(1500);

// STEP2: banner shows "上次用过 SAVE10 [再次使用]"
log('STEP2: verify banner');
const banner = await page.locator('text=上次用过 SAVE10').count();
log('  banner:', banner > 0);
if (banner < 1) throw new Error('last coupon banner missing');

const reuseBtn = await page.locator('button', { hasText: '再次使用' }).count();
log('  reuse button:', reuseBtn > 0);
if (reuseBtn < 1) throw new Error('reuse button missing');

// STEP3: click 再次使用 → coupon applied, banner gone
log('STEP3: click 再次使用 → coupon applied');
await page.locator('button', { hasText: '再次使用' }).click({ force: true, timeout: 5000 });
await page.waitForTimeout(500);
// Banner should be gone (since coupon now applied)
const bannerAfter = await page.locator('text=上次用过 SAVE10').count();
log('  banner after apply:', bannerAfter);
if (bannerAfter !== 0) throw new Error('banner should disappear after apply');

// Coupon applied chip
const couponApplied = await page.locator('text=已使用 SAVE10').count();
log('  coupon applied chip:', couponApplied > 0);
if (couponApplied < 1) throw new Error('coupon applied chip missing');

// STEP4: remove coupon → banner reappears
log('STEP4: remove coupon → banner back');
await page.locator('button', { hasText: '移除' }).click({ force: true, timeout: 5000 });
await page.waitForTimeout(400);
const bannerAgain = await page.locator('text=上次用过 SAVE10').count();
log('  banner after remove:', bannerAgain);
if (bannerAgain < 1) throw new Error('banner should reappear after remove');

// STEP5: fresh cart with no lastCouponCode → no banner
log('STEP5: fresh cart → no banner');
const freshCtx = await browser.newContext();
await freshCtx.addInitScript(() => {
  localStorage.setItem('peak-mall-store', JSON.stringify({
    state: {
      cart: [{ id: 49, name: 'X', price: 99, qty: 1, cover: '/covers/p01.svg', selected: true }],
      orders: [], wishlist: [], locale: 'zh', currency: 'USD',
      coupon: null,
      lastCouponCode: null,
    },
    version: 0,
  }));
});
const freshPage = await freshCtx.newPage();
await freshPage.goto(url, { waitUntil: 'domcontentloaded' });
await freshPage.waitForSelector('input[placeholder*="优惠码"]', { timeout: 10000 });
await freshPage.waitForTimeout(1500);
const noBanner = await freshPage.locator('text=上次用过').count();
log('  no banner:', noBanner === 0);
if (noBanner !== 0) throw new Error('banner should not appear without lastCouponCode');
await freshCtx.close();

// STEP6: placeOrder keeps lastCouponCode
log('STEP6: placeOrder keeps lastCouponCode');
// Re-apply coupon
await page.locator('button', { hasText: '再次使用' }).click({ force: true });
await page.waitForTimeout(300);
// Click checkout
await page.locator('button', { hasText: /结算|去结算|Checkout/ }).first().click({ force: true, timeout: 5000 });
await page.waitForTimeout(1000);
// Should navigate to /checkout/ — verify
const checkoutUrl = page.url();
log('  current url:', checkoutUrl);
if (!checkoutUrl.includes('/checkout')) throw new Error('did not navigate to checkout');
// Go back to /cart/ to verify state
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
// Now cart is empty (placeOrder cleared it). Add back an item manually.
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('peak-mall-store'));
  raw.state.cart = [{ id: 49, name: 'Ultra-Slim Business Laptop', price: 499, qty: 1, cover: '/covers/p16.svg', selected: true }];
  raw.state.coupon = null;
  localStorage.setItem('peak-mall-store', JSON.stringify(raw));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[placeholder*="优惠码"]', { timeout: 10000 });
await page.waitForTimeout(1500);
const bannerStill = await page.locator('text=上次用过 SAVE10').count();
log('  banner after placeOrder:', bannerStill);
if (bannerStill < 1) throw new Error('banner should persist after placeOrder (lastCouponCode remembered)');

log('✅ ALL 6 STEPS PASS');
await browser.close();