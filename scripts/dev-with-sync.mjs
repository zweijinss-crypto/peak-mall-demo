#!/usr/bin/env node
// dev-with-sync.mjs — peak-mall-demo dev wrapper
//
// dev 启动前自动跑 sync-whitelist,把 pay-records-crawler 最新的白名单
// 拉到 public/whitelist.json。然后启 next dev。
// 60s 后台轮询再 sync,保证 pay-records 端加新卡 / 改额度时 peak-mall checkout 立刻能看到。
//
// 用法:
//   node scripts/dev-with-sync.mjs        # 默认 PAY_RECORDS_URL=http://127.0.0.1:3010
//   PAY_RECORDS_URL=http://x.x.x.x:3010 node scripts/dev-with-sync.mjs
//
// 60s 轮询对 dev server 影响:
//   - sync 只写 public/whitelist.json (~6KB),不重启 next dev
//   - public/* 变更 Next 会触发 Fast Refresh (白名单 dropdown 重新 fetch /whitelist.json)
//   - 同进程 setInterval,不阻塞 dev

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAY_RECORDS_URL = process.env.PAY_RECORDS_URL || 'http://127.0.0.1:3010';
const POLL_MS = 60_000;

async function syncOnce() {
  const url = `${PAY_RECORDS_URL}/api/whitelist?reveal=cvv`;
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[dev-sync] HTTP ${res.status} from ${url} — keep current whitelist.json`);
      return false;
    }
    const data = await res.json();
    if (!Array.isArray(data.cards)) {
      console.warn('[dev-sync] bad payload — keep current whitelist.json');
      return false;
    }
    const parts = data.cards.map((line) => line.split('|'));
    const parsed = parts.map((p) => ({
      card_number: p[0] || '',
      expiry: p[1] || '',
      cvv: p[2] || '',
      holder: p[3] || '',
      address: p[4] || '',
      city: p[5] || '',
      state: p[6] || '',
      country: p[7] || '',
      zip: p[8] || '',
      phone: p[9] || '',
      email: p[10] || '',
      limit: Number(p[11]) || 0,
      used: 0,
    })).filter(c => c.card_number && c.card_number.length >= 13);

    // 第二轮: 拿 /api/cards 补 used
    try {
      const cardsRes = await fetch(`${PAY_RECORDS_URL}/api/cards`);
      if (cardsRes.ok) {
        const j = await cardsRes.json();
        const cards = Array.isArray(j) ? j : (Array.isArray(j.cards) ? j.cards : []);
        const usedByNumber = new Map(cards.map(c => [String(c.card_number || ''), Number(c.used || 0)]));
        for (const p of parsed) {
          if (usedByNumber.has(p.card_number)) p.used = usedByNumber.get(p.card_number) || 0;
        }
      }
    } catch { /* keep used=0 */ }

    const { writeFileSync, mkdirSync } = await import('node:fs');
    const OUT = join(__dirname, '..', 'public', 'whitelist.json');
    mkdirSync('public', { recursive: true });
    writeFileSync(OUT, JSON.stringify({
      synced_at: new Date().toISOString(),
      source: PAY_RECORDS_URL,
      count: parsed.length,
      cards: parsed,
    }, null, 2));
    console.log(`[dev-sync] synced ${parsed.length} cards in ${Date.now() - t0}ms → ${OUT}`);
    return true;
  } catch (e) {
    console.warn(`[dev-sync] fetch failed (${e.code || e.message}) — keep current whitelist.json`);
    return false;
  }
}

async function main() {
  console.log(`[dev-sync] preboot sync from ${PAY_RECORDS_URL} …`);
  const ok = await syncOnce();
  if (!ok) {
    console.warn('[dev-sync] preboot sync failed — starting dev anyway (will retry in 60s)');
  }
  // 启动 next dev (pnpm 项目用 node_modules/.bin/next)
  const child = spawn('./node_modules/.bin/next', ['dev', '-p', '3002'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,  // .bin 路径需要 shell 解析
  });
  // 60s 后台轮询
  setInterval(() => { syncOnce(); }, POLL_MS);
  // 转发信号
  const stop = (sig) => { console.log(`[dev-sync] received ${sig}, forwarding`); child.kill(sig); process.exit(0); };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}

main().catch(e => { console.error(e); process.exit(99); });