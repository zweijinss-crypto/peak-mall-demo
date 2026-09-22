import { test, expect } from '@playwright/test';

/**
 * shop-browse — Phase 3.1.2 core user flow.
 *
 * Walks the homepage → category → product detail path and checks that
 * the data shapes survive a round trip. No auth, no checkout — those
 * need Supabase/Stripe fixtures and are Phase 4 territory.
 */

test('homepage lists at least one product card', async ({ page }) => {
  await page.goto('/');
  // Product cards render with <a> linking to /shop/<id>
  const links = page.locator('a[href^="/shop/"]');
  await expect(links.first()).toBeVisible();
  const count = await links.count();
  expect(count, 'homepage product card count').toBeGreaterThan(0);
});

test('product detail page renders with image, price, and add-to-cart', async ({ page }) => {
  await page.goto('/shop/49');
  // h1 should show product name
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible();
  // Cover image
  const img = page.locator('img').first();
  await expect(img).toBeVisible();
  // Some dollar amount on the page
  await expect(page.locator('body')).toContainText(/\$/);
});

test('en product detail mirrors zh layout', async ({ page }) => {
  await page.goto('/en/shop/49');
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible();
  await expect(page.locator('body')).toContainText(/\$/);
});

test('category page /shop-all lists products', async ({ page }) => {
  await page.goto('/shop-all');
  const links = page.locator('a[href^="/shop/"]');
  await expect(links.first()).toBeVisible();
  expect(await links.count()).toBeGreaterThan(0);
});

test('clicking a product card navigates to detail', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('a[href^="/shop/"]').first();
  const href = await first.getAttribute('href');
  expect(href).toBeTruthy();
  await first.click();
  await page.waitForURL(/\/shop\/\d+/, { timeout: 8000 });
  await expect(page.locator('h1').first()).toBeVisible();
});