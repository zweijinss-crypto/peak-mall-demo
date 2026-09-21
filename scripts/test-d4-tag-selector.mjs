// D4 address tag selector + form error + saved flash Playwright 测试
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:3002';
const log = (...a) => console.log('[D4]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Seed existing address with no tag (tests migration)
await ctx.addInitScript(() => {
  localStorage.setItem('peak_addresses', JSON.stringify([
    { id: 'a1', name: 'Diana Chen', phone: '13800001234', region: '上海市 浦东新区', detail: '张江路 88 号', isDefault: true },
  ]));
});

const url = `${BASE}/address/`;
log('STEP1: open', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('article', { timeout: 10000 });
// Wait for hydration
await page.waitForTimeout(1500);

// STEP2: existing address migrated to default tag=home
const existingTag = await page.locator('article header span').first().textContent();
log('  existing addr first chip:', existingTag);
if (existingTag !== '家') throw new Error(`migration tag expected '家', got '${existingTag}'`);

// STEP3: click 新增地址 → form appears with tag selector
log('STEP3: click 新增地址');
await page.locator('button', { hasText: '新增地址' }).first().click({ force: true });
await page.waitForSelector('[role="radiogroup"]', { timeout: 5000 });
const tagOptions = await page.locator('[role="radio"]').count();
log('  tag options =', tagOptions);
if (tagOptions !== 3) throw new Error(`expected 3 tag options, got ${tagOptions}`);

// STEP4: default selection is 'home' (家)
const activeTag = await page.locator('[role="radio"][aria-checked="true"]').textContent();
log('  active tag:', activeTag);
if (activeTag !== '家') throw new Error(`default tag expected '家', got '${activeTag}'`);

// STEP5: click save with empty name → name error shown
log('STEP5: save empty form → name required error');
// Fill phone but leave name empty
await page.locator('input[maxlength="11"]').fill('13800001234');
await page.locator('button', { hasText: '保存' }).first().click({ force: true });
await page.waitForTimeout(300);
const nameErrCount = await page.locator('text=请填写收货人姓名').count();
log('  name error shown:', nameErrCount > 0);
if (nameErrCount < 1) throw new Error('name required error missing');
// form should still be open
const formStillOpen = await page.locator('[role="radiogroup"]').count();
if (formStillOpen < 1) throw new Error('form closed prematurely');

// STEP6: click '公司' tag → active
log('STEP6: select 公司 tag');
await page.locator('[role="radio"]', { hasText: '公司' }).click({ force: true });
await page.waitForTimeout(200);
const officeActive = await page.locator('[role="radio"][aria-checked="true"]').textContent();
if (officeActive !== '公司') throw new Error('公司 tag did not become active');

// STEP7: fill name + save → address added + saved flash + tag chip = 公司
log('STEP7: fill name + save');
await page.locator('input[maxlength="11"]').fill('13912345678');
// The name input may have aria-invalid=true from STEP5. Use label-based fill.
// Click on the input next to the '收货人' label.
await page.locator('label', { hasText: '收货人' }).locator('input').fill('Office Worker');
await page.waitForTimeout(200);
// re-pick tag office (still active)
await page.locator('button', { hasText: '保存' }).first().click({ timeout: 5000 });
await page.waitForTimeout(500);

// STEP8: saved flash toast appears
const flash = await page.locator('[role="status"]', { hasText: '地址已保存' }).count();
log('  saved flash:', flash > 0);
if (flash < 1) throw new Error('saved flash missing');

// STEP9: new address card shows 公司 tag
await page.waitForTimeout(2000); // wait for flash to dismiss
const articles = await page.locator('article').count();
log('  total articles =', articles);
if (articles !== 2) throw new Error(`expected 2 articles, got ${articles}`);
const newCardChips = await page.locator('article header span').allTextContents();
log('  card chips:', newCardChips);
const hasOfficeChip = newCardChips.some((c) => c === '公司');
if (!hasOfficeChip) throw new Error('new card missing 公司 tag chip');

// STEP10: edit existing → tag selector shows current tag
log('STEP10: edit existing address');
await page.locator('article', { hasText: 'Diana Chen' }).locator('button', { hasText: '编辑' }).click({ force: true });
await page.waitForSelector('[role="radiogroup"]', { timeout: 5000 });
const editActiveTag = await page.locator('[role="radio"][aria-checked="true"]').textContent();
log('  edit form active tag:', editActiveTag);
if (editActiveTag !== '家') throw new Error(`edit: expected tag '家' (from migration), got '${editActiveTag}'`);

// STEP11: change tag to 其他 → save → card updates
log('STEP11: change tag to 其他 + save');
await page.locator('[role="radio"]', { hasText: '其他' }).click({ force: true });
await page.locator('button', { hasText: '保存' }).first().click({ force: true });
await page.waitForTimeout(500);
const updatedChips = await page.locator('article header span').allTextContents();
const hasOtherChip = updatedChips.some((c) => c === '其他');
if (!hasOtherChip) throw new Error('card tag not updated to 其他');

// STEP12: cancel button works
log('STEP12: cancel clears form');
await page.locator('button', { hasText: '+ 新增地址' }).first().click({ force: true });
await page.waitForSelector('[role="radiogroup"]', { timeout: 5000 });
await page.locator('button', { hasText: '取消' }).first().click({ force: true });
await page.waitForTimeout(300);
const formAfterCancel = await page.locator('[role="radiogroup"]').count();
if (formAfterCancel !== 0) throw new Error('cancel did not close form');

log('✅ ALL 12 STEPS PASS');
await browser.close();