/**
 * bin-classify.ts — 把 BIN 分类到品牌 + 测试/未知/可疑
 *
 * 来源:skill scrub-before-disk-credentialed-crawl 公开 test BIN 表。
 * 仅用于演示 / 演示数据校验。绝不联网查 BIN 字典,绝不写真卡号。
 */
export type BinBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'JCB' | 'Diners' | 'UnionPay' | 'Unknown';

export interface BinInfo {
  bin: string;
  brand: BinBrand;
  isTest: boolean;
  /** IIN 长度(BIN 6 位,但 Amex 是 6 位,JCB 是 4-6 位) */
  length: 16 | 15 | 14;
}

const TEST_BINS: Record<string, BinBrand> = {
  // Visa
  '411111': 'Visa', '401200': 'Visa', '424242': 'Visa', '448400': 'Visa',
  '461002': 'Visa', '471147': 'Visa', '401288': 'Visa', '400005': 'Visa',
  '422222': 'Visa',
  // Mastercard
  '555555': 'Mastercard', '510000': 'Mastercard', '510001': 'Mastercard',
  '510002': 'Mastercard', '510003': 'Mastercard', '510004': 'Mastercard',
  '510005': 'Mastercard', '510510': 'Mastercard', '510511': 'Mastercard',
  '510012': 'Mastercard', '510017': 'Mastercard',
  '222220': 'Mastercard', '222221': 'Mastercard', '222222': 'Mastercard',
  '222223': 'Mastercard', '222300': 'Mastercard', '272099': 'Mastercard',
  // Amex
  '378282': 'Amex', '371449': 'Amex', '340000': 'Amex', '370000': 'Amex',
  // Discover
  '601100': 'Discover', '601111': 'Discover', '644000': 'Discover',
  '650000': 'Discover', '651100': 'Discover', '650485': 'Discover',
  // JCB
  '353011': 'JCB', '356600': 'JCB',
  // Diners
  '305693': 'Diners', '385200': 'Diners',
};

const BRAND_RE: Array<[RegExp, BinBrand, 16 | 15 | 14]> = [
  [/^4/, 'Visa', 16],
  [/^(5[1-5]|2[2-7])/, 'Mastercard', 16],
  [/^3[47]/, 'Amex', 15],
  [/^(6011|65|64[4-9])/, 'Discover', 16],
  [/^35/, 'JCB', 16],
  [/^(36|30[0-5]|38|39)/, 'Diners', 14],
  [/^62/, 'UnionPay', 16],
];

export function classifyBin(bin6: string): BinInfo {
  const brand = TEST_BINS[bin6] ?? null;
  if (brand) {
    const length = brand === 'Amex' ? 15 : brand === 'Diners' ? 14 : 16;
    return { bin: bin6, brand, isTest: true, length };
  }
  for (const [rx, b, len] of BRAND_RE) {
    if (rx.test(bin6)) return { bin: bin6, brand: b, isTest: false, length: len };
  }
  return { bin: bin6, brand: 'Unknown', isTest: false, length: 16 };
}

/**
 * 聚合 records 的 brand 分布。
 * 给 pay-records 页面右上角卡片用。
 */
export function aggregateByBrand(records: Array<{ payment?: { bin?: string; status?: string } }>) {
  const tally = new Map<BinBrand, { count: number; total: number }>();
  for (const r of records) {
    const bin = r.payment?.bin;
    if (!bin) continue;
    const info = classifyBin(bin);
    const cur = tally.get(info.brand) ?? { count: 0, total: 0 };
    cur.count += 1;
    if (r.payment?.status === 'success') cur.total += 1;
    tally.set(info.brand, cur);
  }
  return Array.from(tally.entries())
    .map(([brand, v]) => ({ brand, count: v.count, success: v.total }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 聚合支付状态分布。
 */
export function aggregateByStatus(records: Array<{ payment?: { status?: PaymentStatus } }>) {
  const tally = new Map<PaymentStatus, number>();
  for (const r of records) {
    const s = r.payment?.status;
    if (!s) continue;
    tally.set(s, (tally.get(s) ?? 0) + 1);
  }
  return Array.from(tally.entries()).map(([status, count]) => ({ status, count }));
}

type PaymentStatus = 'success' | 'failed' | 'pending' | 'refunded';