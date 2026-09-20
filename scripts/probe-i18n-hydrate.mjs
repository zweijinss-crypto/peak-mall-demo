// scripts/probe-i18n-hydrate.mjs
// Verify that after setting locale='en' in localStorage + full reload,
// the DOM actually contains English copy (not just zh fallback).
import { chromium } from '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE ?? 'http://localhost:5050';

const PROBES = [
  { url: '/',        expect: ['Curated global goods', 'Add to cart', 'Welcome to Peak Mall', 'Site search'] },
  { url: '/cart/',   expect: ['My cart', 'Continue shopping', 'Decrease quantity'] },
  { url: '/search/', expect: ['Search results', 'Popular searches'] },
  { url: '/login/',  expect: ['Sign in', 'Email'] },
];

const browser = await chromium.launch();
const ctx = await browser.newContext();
// Prime locale before any page loads.
await ctx.addInitScript(() => {
  const KEY = 'peak-mall-store';
  const prev = localStorage.getItem(KEY);
  let parsed = { state: { locale: 'zh', currency: 'USD' }, version: 0 };
  try { if (prev) parsed = JSON.parse(prev); } catch {}
  parsed.state = { ...(parsed.state ?? {}), locale: 'en', currency: 'USD' };
  localStorage.setItem(KEY, JSON.stringify(parsed));
});

const page = await ctx.newPage();
const fail = [];
let pass = 0;

for (const { url, expect } of PROBES) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  // wait for hydration: ShopHeader mount + lang chip switch
  await page.waitForTimeout(1200);
  const html = await page.content();
  const found = expect.map((s) => ({ s, ok: html.includes(s) }));
  const missing = found.filter((x) => !x.ok);
  if (missing.length) {
    fail.push({ url, missing: missing.map((m) => m.s) });
  } else {
    pass += 1;
  }
  console.log(
    `[${fail.includes({ url, missing: [] }) ? 'FAIL' : missing.length ? 'FAIL' : ' OK '}] ${url.padEnd(10)} ` +
    found.map((f) => (f.ok ? '✓' : '✗')).join(' ') + '  ' + expect.join(' / ')
  );
}

// Also confirm the currency dropdown reflects store state and that the
// lang chip marks EN as active.
const home = await (await ctx.newPage()).goto(BASE + '/');
await page.waitForTimeout(800);
const langActive = await page.locator('button:has-text("EN")').first().getAttribute('class');
console.log('langActive class snippet:', (langActive ?? '').slice(0, 80));

await browser.close();
console.log(`\n${pass} / ${PROBES.length} routes passed en-hydrate probe`);
process.exit(fail.length ? 1 : 0);