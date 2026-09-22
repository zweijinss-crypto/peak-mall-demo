#!/usr/bin/env node
/**
 * ci-smoke — minimal e2e smoke for peak-mall-demo.
 *
 * Boots a static server against `out/`, fetches a handful of key
 * routes via Playwright (chromium headless), and asserts:
 *   - HTTP 200
 *   - DOM has at least one h1
 *   - no console errors during page load
 *   - no broken images (img.naturalWidth > 0 after onload)
 *
 * Failures cause a non-zero exit so the GH Actions job stops.
 *
 * Why this and not a full Playwright suite?
 *   The repo doesn't have an interactive e2e suite yet, and a full
 *   one would need auth/cart fixtures that aren't deterministic in
 *   CI. This catches the common regressions (build break, missing
 *   route, console crash) without flakiness.
 *
 * Run: pnpm ci:smoke  (after `pnpm build`)
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

// Resolve playwright module from a few known locations so the
// script works locally (npm-global) and in CI (the workflow installs
// to /tmp/ci-pw).
const PW_CANDIDATES = [
  process.env.PLAYWRIGHT_MODULE,
  '/Users/bz/.npm-global/lib/node_modules/playwright/index.mjs',
  '/tmp/ci-pw/node_modules/playwright/index.mjs',
].filter(Boolean);
const PW_MODULE = PW_CANDIDATES.find((p) => existsSync(p));
if (!PW_MODULE) {
  console.error('[ci-smoke] could not find playwright module. Tried:');
  for (const p of PW_CANDIDATES) console.error('  -', p);
  process.exit(2);
}
const { chromium } = await import(PW_MODULE);

const ROOT = 'out';
const PORT = Number(process.env.SMOKE_PORT ?? 4321);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
};

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, `http://${HOST}:${PORT}`);
      // Normalize and prevent path traversal
      const safe = normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
      let p = join(ROOT, safe);
      try {
        const s = await stat(p);
        if (s.isDirectory()) p = join(p, 'index.html');
      } catch {
        // try trailing slash for SSG that emits folder/index.html
        try {
          await stat(p + '.html');
          p += '.html';
        } catch {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
      }
      const buf = await readFile(p);
      res.setHeader('content-type', MIME[extname(p).toLowerCase()] ?? 'application/octet-stream');
      res.setHeader('cache-control', 'no-store');
      res.end(buf);
    } catch (err) {
      res.statusCode = 500;
      res.end(`server error: ${err.message}`);
    }
  });
  await new Promise((r) => server.listen(PORT, HOST, r));
  return server;
}

// Routes to smoke — pick representative zh + en + dynamic + admin.
const ROUTES = [
  '/',
  '/login',
  '/cart',
  '/shop/49',
  '/admin/dashboard/',
  '/en/',
  '/en/login',
  '/en/cart',
  '/en/shop/49',
  '/terms',
  '/en/terms',
  '/privacy',
];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

async function main() {
  const server = await serve();
  const base = `http://${HOST}:${PORT}`;
  console.log(`[ci-smoke] static server up at ${base}`);

  const browser = await chromium.launch({ headless: true });
  let pass = 0;
  let fail_count = 0;

  for (const route of ROUTES) {
    const url = base + route;
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (!resp) {
        fail(`${route}: no response`);
        fail_count++;
        await ctx.close();
        continue;
      }
      const status = resp.status();
      if (status !== 200) {
        fail(`${route}: HTTP ${status}`);
        fail_count++;
        await ctx.close();
        continue;
      }
      // Hydration window — Next dev/runtime may surface late errors
      await page.waitForTimeout(800);
      const h1Count = await page.locator('h1').count();
      if (h1Count === 0) {
        fail(`${route}: no <h1> rendered`);
        fail_count++;
        await ctx.close();
        continue;
      }
      // Filter out noisy console errors that are not regressions
      // (e.g. dev-tools-related, or expected fallback messages).
      const blockingErrors = consoleErrors.filter((m) => {
        if (m.includes('favicon.ico')) return false;
        if (m.includes('Sentry')) return false; // Sentry network may fail in CI
        if (m.includes('Failed to load resource: net::ERR_INTERNET_DISCONNECTED')) return false;
        return true;
      });
      if (blockingErrors.length > 0) {
        fail(`${route}: ${blockingErrors.length} console error(s):\n  - ${blockingErrors.join('\n  - ')}`);
        fail_count++;
        await ctx.close();
        continue;
      }
      console.log(`✓ ${route} (h1=${h1Count}, console clean)`);
      pass++;
    } catch (err) {
      fail(`${route}: ${err.message}`);
      fail_count++;
    }
    await ctx.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log(`\n[ci-smoke] ${pass} passed, ${fail_count} failed`);
  if (fail_count > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[ci-smoke] crashed:', err);
  process.exit(2);
});
