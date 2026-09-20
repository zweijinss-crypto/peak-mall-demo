#!/usr/bin/env node
// gen-covers.mjs
// 本地生成 8 个主题占位 SVG,用作 ProductCard 的 cover fallback
// 输出: ../public/covers/p{1..8}.svg (相对 scripts/ 目录)
//
// 红线: 不连网,不用第三方 CDN,纯本地 SVG
// 用法: node scripts/gen-covers.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'covers');

const themes = [
  { file: 'p1.svg', emoji: '📦', label: 'PRODUCT 01', from: '#eff6ff', to: '#dbeafe' },
  { file: 'p2.svg', emoji: '🎧', label: 'PRODUCT 02', from: '#f5f3ff', to: '#ede9fe' },
  { file: 'p3.svg', emoji: '👕', label: 'PRODUCT 03', from: '#fff7ed', to: '#ffedd5' },
  { file: 'p4.svg', emoji: '⌚', label: 'PRODUCT 04', from: '#ecfdf5', to: '#d1fae5' },
  { file: 'p5.svg', emoji: '🍵', label: 'PRODUCT 05', from: '#fef2f2', to: '#fee2e2' },
  { file: 'p6.svg', emoji: '🛋️', label: 'PRODUCT 06', from: '#fefce8', to: '#fef9c3' },
  { file: 'p7.svg', emoji: '📱', label: 'PRODUCT 07', from: '#f0f9ff', to: '#e0f2fe' },
  { file: 'p8.svg', emoji: '💄', label: 'PRODUCT 08', from: '#fdf4ff', to: '#fae8ff' },
];

function makeSvg({ emoji, label, from, to }) {
  // 1 KB 左右的本地 SVG: 渐变背景 + grid pattern + 大 emoji + 小 label
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(15,23,42,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <rect width="400" height="300" fill="url(#grid)"/>
  <text x="200" y="170" font-size="120" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="20" y="280" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" font-weight="600" fill="rgba(15,23,42,0.5)" letter-spacing="2">${label}</text>
  <text x="380" y="280" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="10" fill="rgba(15,23,42,0.3)" text-anchor="end">PLACEHOLDER</text>
</svg>`;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const t of themes) {
    const svg = makeSvg(t);
    await writeFile(join(outDir, t.file), svg, 'utf8');
    console.log(`✓ ${t.file}`);
  }
  console.log(`\nGenerated ${themes.length} covers in ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});