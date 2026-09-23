#!/usr/bin/env node
// sync-whitelist.mjs — 从 pay-records-crawler 拉白名单 → peak-mall-demo/public/whitelist.json
//
// 用法:
//   PAY_RECORDS_URL=http://127.0.0.1:3010 node scripts/sync-whitelist.mjs
//
// 默认 PAY_RECORDS_URL=http://127.0.0.1:3010
// 走本机 loopback,CVV 通过 ?reveal=cvv 拿明文 — 只在本机可信网络下用。
// 公网部署时应该走反向代理 + 鉴权,见 pay-records README「部署到生产」。

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAY_RECORDS_URL = process.env.PAY_RECORDS_URL || 'http://127.0.0.1:3010';
const OUT = join(__dirname, '..', 'public', 'whitelist.json');

async function main() {
  const url = `${PAY_RECORDS_URL}/api/whitelist?reveal=cvv`;
  console.log(`[sync-whitelist] GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[sync-whitelist] HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  if (!Array.isArray(data.cards)) {
    console.error('[sync-whitelist] bad payload: expected {cards: []}');
    process.exit(2);
  }
  // 解析 pipe 格式 → JSON 对象数组
  // 13 字段(中间 zip 可能为空): 卡号|有效期|cvv|姓名|地址|城市|州|国家|邮编|电话|邮箱|额度
  // pay-records server.js 顺序: card_number|expiry|cvv|holder|address|city|state|country|zip|phone|email|card_limit
  const parsed = data.cards.map((line) => {
    const parts = line.split('|');
    return {
      card_number: parts[0] || '',
      expiry: parts[1] || '',
      cvv: parts[2] || '',
      holder: parts[3] || '',
      address: parts[4] || '',
      city: parts[5] || '',
      state: parts[6] || '',
      country: parts[7] || '',
      zip: parts[8] || '',
      phone: parts[9] || '',
      email: parts[10] || '',
      limit: Number(parts[11]) || 0,
    };
  }).filter(c => c.card_number && c.card_number.length >= 13);  // 滤掉 5454 空行 / 测试占位

  const out = {
    synced_at: new Date().toISOString(),
    source: PAY_RECORDS_URL,
    count: parsed.length,
    cards: parsed,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`[sync-whitelist] wrote ${parsed.length} cards → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(99); });