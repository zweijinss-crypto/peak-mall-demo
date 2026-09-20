/**
 * pay-fixtures.ts — pay-records 页面演示数据
 *
 * 红线 (skill: scrub-before-disk-credentialed-crawl):
 *   1. 所有 BIN 必须来自公开 test BIN 表(411111/424242/555555/378282/601100/...)
 *   2. last4 用确定性伪随机生成,不写真卡末四位
 *   3. 真实生产环境,支付网关 tokenize,前端绝不持有卡号
 *
 * 数据形态:
 *   - 16 个订单,对应 16 个 shop 商品
 *   - 覆盖 3 种支付方式 × 5 种支付状态 × 6 种 BIN
 *   - 总金额/时间分布接近真实商城(过去 10 天)
 */
import type { Order, OrderItem, PaymentRecord } from './store';
import { PRODUCTS } from '@/data/products';

const TEST_BINS: Array<{ bin: string; brand: PaymentRecord['brand']; cardType: 'visa' | 'mc' | 'amex' | 'disc' | 'jcb' | 'diners' }> = [
  // 公开测试 BIN(见 skill scrub-before-disk-credentialed-crawl)
  { bin: '411111', brand: 'Visa', cardType: 'visa' },
  { bin: '424242', brand: 'Visa', cardType: 'visa' },
  { bin: '448400', brand: 'Visa', cardType: 'visa' },
  { bin: '555555', brand: 'Mastercard', cardType: 'mc' },
  { bin: '510510', brand: 'Mastercard', cardType: 'mc' },
  { bin: '378282', brand: 'Amex', cardType: 'amex' },
  { bin: '601100', brand: 'Discover', cardType: 'disc' },
  { bin: '353011', brand: 'JCB', cardType: 'jcb' },
  { bin: '305693', brand: 'Diners', cardType: 'diners' },
];

const STATUS_POOL: Array<{ status: PaymentRecord['status']; orderStatus: Order['status']; weight: number }> = [
  { status: 'success', orderStatus: 'delivered', weight: 0.55 },
  { status: 'success', orderStatus: 'shipped', weight: 0.12 },
  { status: 'success', orderStatus: 'paid', weight: 0.08 },
  { status: 'failed', orderStatus: 'pending', weight: 0.12 },
  { status: 'pending', orderStatus: 'pending', weight: 0.06 },
  { status: 'refunded', orderStatus: 'delivered', weight: 0.07 },
];

const ERROR_POOL: PaymentRecord['errorCode'][] = [
  'INSUFFICIENT_FUNDS',
  'CARD_DECLINED',
  'EXPIRED',
  'CVV_MISMATCH',
  'NETWORK',
];

const METHODS: PaymentRecord['method'][] = ['card', 'card', 'card', 'card', 'wallet', 'bank'];

// Deterministic PRNG (mulberry32) — same seed → same fixtures every reload.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(rng: () => number, pool: T[]): T {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let pick = rng() * total;
  for (const x of pool) {
    pick -= x.weight;
    if (pick <= 0) return x;
  }
  return pool[pool.length - 1];
}

function randomLast4(rng: () => number, cardType: 'visa' | 'mc' | 'amex' | 'disc' | 'jcb' | 'diners'): string {
  // Amex 4 位,其他 4 位(演示统一 4)
  let n = '';
  for (let i = 0; i < 4; i++) n += Math.floor(rng() * 10);
  return n;
}

function randomAuthCode(rng: () => number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(rng() * chars.length)];
  return s;
}

/**
 * 生成 16 个订单,每个订单带一个 PaymentRecord。
 * 使用种子 42 保证刷新页面数据稳定。
 */
export function buildDemoOrders(): Order[] {
  const rng = mulberry32(42);
  const now = Date.now();
  const orders: Order[] = [];

  // 用 16 个商品作为订单骨架
  const products = PRODUCTS.slice(0, 16);
  products.forEach((p, idx) => {
    const price = parseFloat(String(p.price));
    const qty = 1 + Math.floor(rng() * 2); // 1-2 件
    const total = parseFloat((price * qty).toFixed(2));

    // 时间分布:过去 10 天内,idx 越靠后越新
    const daysAgo = (16 - idx) * 0.7 + rng() * 0.3;
    const createdAt = Math.floor(now - daysAgo * 24 * 3600 * 1000);

    const w = pickWeighted(rng, STATUS_POOL);
    const binInfo = TEST_BINS[Math.floor(rng() * TEST_BINS.length)];
    const method = METHODS[Math.floor(rng() * METHODS.length)];
    const last4 = randomLast4(rng, binInfo.cardType);

    const payment: PaymentRecord = {
      method,
      brand: binInfo.brand,
      bin: binInfo.bin,
      last4,
      amount: total,
      currency: 'USD',
      status: w.status,
      authCode: w.status === 'success' ? randomAuthCode(rng) : undefined,
      errorCode:
        w.status === 'failed'
          ? ERROR_POOL[Math.floor(rng() * ERROR_POOL.length)]
          : undefined,
      paidAt: w.status === 'success' || w.status === 'refunded' ? createdAt + Math.floor(rng() * 60_000) : undefined,
    };

    const item: OrderItem = {
      productId: p.id,
      name: p.name,
      price,
      qty,
      cover: p.cover,
    };

    orders.push({
      id: 'O' + createdAt.toString(36).toUpperCase() + '-' + idx.toString(36).toUpperCase().padStart(2, '0'),
      createdAt,
      items: [item],
      total,
      status: w.orderStatus,
      payment,
    });
  });

  // 时间倒序
  orders.sort((a, b) => b.createdAt - a.createdAt);
  return orders;
}