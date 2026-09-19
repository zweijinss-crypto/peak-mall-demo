/**
 * 一次性生成 16 件商品的本地 SVG 占位图
 *
 * 输出:public/covers/p01.svg ... p16.svg
 * 主题:
 *   - 数码电子:冷蓝/靛紫渐变 + 几何线 + 品类 emoji
 *   - 家用电器:暖橙/琥珀渐变 + 几何线 + 品类 emoji
 *
 * 跑法:node scripts/gen-covers.mjs
 */
import fs from 'fs';
import path from 'path';

const out = path.resolve('public/covers');
fs.mkdirSync(out, { recursive: true });

const PRODUCTS = [
  { n: 'p01', name: 'Magnetic Cable Organizer', icon: '🧲', cat: 'digital' },
  { n: 'p02', name: 'Portable USB Mini Fan',     icon: '🌀', cat: 'digital' },
  { n: 'p03', name: 'Foldable 30W Fast Charger', icon: '🔌', cat: 'digital' },
  { n: 'p04', name: 'Bluetooth Selfie Stick Tripod', icon: '🤳', cat: 'digital' },
  { n: 'p05', name: 'Mini Bluetooth Speaker',    icon: '🔊', cat: 'digital' },
  { n: 'p06', name: '10000mAh Wireless Power Bank', icon: '🔋', cat: 'digital' },
  { n: 'p07', name: 'ANC Wireless Earbuds',      icon: '🎧', cat: 'digital' },
  { n: 'p08', name: 'Smart Fitness Band',        icon: '⌚', cat: 'digital' },
  { n: 'p09', name: 'Smart GPS Sports Watch',    icon: '⏱️', cat: 'digital' },
  { n: 'p10', name: 'Portable Photo Printer',    icon: '🖨️', cat: 'digital' },
  { n: 'p11', name: '4K Action Camera',          icon: '📸', cat: 'digital' },
  { n: 'p12', name: 'Portable 1080P Projector',  icon: '📽️', cat: 'digital' },
  { n: 'p13', name: 'Over-Ear ANC Headphones',   icon: '🎵', cat: 'digital' },
  { n: 'p14', name: 'Smart Robot Vacuum',        icon: '🤖', cat: 'home'    },
  { n: 'p15', name: 'Foldable Camera Drone',     icon: '🛸', cat: 'digital' },
  { n: 'p16', name: 'Ultra-Slim Business Laptop', icon: '💻', cat: 'digital' },
];

const THEME = {
  digital: { bg1: '#1e3a8a', bg2: '#312e81', accent: '#60a5fa' },
  home:    { bg1: '#7c2d12', bg2: '#9a3412', accent: '#fb923c' },
};

function svgFor({ name, icon, cat }, idx) {
  const t = THEME[cat];
  const short = name.split(' ').slice(0, 2).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg1}"/>
      <stop offset="100%" stop-color="${t.bg2}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${t.accent}" stroke-width="0.5" stroke-opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect width="800" height="800" fill="url(#grid)"/>
  <circle cx="650" cy="150" r="220" fill="${t.accent}" fill-opacity="0.10"/>
  <circle cx="120" cy="700" r="180" fill="white" fill-opacity="0.06"/>
  <g transform="translate(400 360)">
    <text text-anchor="middle" font-size="220" y="40">${icon}</text>
  </g>
  <text x="60" y="740" fill="white" fill-opacity="0.95"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="700" font-size="34" letter-spacing="0.5">
    ${short}
  </text>
  <text x="60" y="775" fill="white" fill-opacity="0.55"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="500" font-size="18" letter-spacing="3">
    PEAK MALL · ${String(idx + 1).padStart(2, '0')}
  </text>
</svg>`;
}

let ok = 0;
for (const [i, p] of PRODUCTS.entries()) {
  const svg = svgFor(p, i);
  const file = path.join(out, `${p.n}.svg`);
  fs.writeFileSync(file, svg);
  ok++;
}
console.log(`generated ${ok} covers in ${out}`);