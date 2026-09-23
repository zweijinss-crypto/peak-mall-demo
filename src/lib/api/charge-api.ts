/**
 * charge-api — peak-mall → pay-records-crawler 真支付打通
 *
 * Phase 2 路径(覆盖 confirmPay):
 *   1. Client 调 chargeOnPeak() — 用白名单卡号/exp/cvv/holder + 金额
 *   2. 直连 pay-records-crawler (默认 http://127.0.0.1:3010) /api/charge
 *   3. pay-records 校验白名单 + used+amount ≤ card_limit → 落 payment_records
 *   4. 返 { outcome: 'success'|'fail', remaining, order_no, error, ... }
 *
 * 注意:这是 dev/test-only 路径,真实生产需走 Stripe。
 * NEXT_PUBLIC_PAY_RECORDS_BASE 默认 http://127.0.0.1:3010
 * 失败/不可达 → 返回 null,UI 自动降级到 Stripe 路径
 */

export interface ChargeInput {
  card_number: string;
  expiry: string;        // MM/YY
  cvv: string;
  holder: string;
  amount: number;        // dollars (peak-mall 用 dollar,跟 pay-records 对齐)
  order_no?: string;     // 自定义订单号(可选)
  source?: string;       // 标识调用方,默认 'peak-mall'
}

export interface ChargeResult {
  outcome: 'success' | 'fail';
  whitelist: 'match' | 'miss';
  remaining?: number;
  order_no: string;
  card_masked: string;
  error?: string;
}

/**
 * 礼品码输入 / 核销 (Phase 3)
 * peak-mall checkout 给一个「使用礼品码」输入框
 * 预检: redeemOnPeak('preview', code, orderTotal) — 看礼品码是否可用 + 能减多少
 * 提交: redeemOnPeak('redeem', code, amount, orderNo) — 真核销,落 gift_redemptions
 */
export interface RedeemResult {
  outcome: 'success' | 'fail';
  code: string;
  /** 实际减免金额 (request amount 与卡余额的 min) */
  amount_used?: number;
  /** 礼品码剩余可用金额 */
  value_remaining?: number;
  /** 后端生成的订单号 (redeem mode) */
  order_no?: string;
  error?: string;
  expires_at?: string;
}

export async function redeemOnPeak(
  code: string,
  amount: number,
  order_no?: string,
): Promise<RedeemResult | null> {
  const base = getPayRecordsBase();
  try {
    const res = await fetch(`${base}/api/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        amount: Number(amount),
        order_no: order_no || null,
        source: 'peak-mall-checkout',
      }),
    });
    if (!res.ok) {
      return {
        outcome: 'fail',
        code: code.toUpperCase(),
        error: `HTTP ${res.status}`,
      };
    }
    return (await res.json()) as RedeemResult;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.warn('[redeem-api] unreachable:', msg);
    return null;
  }
}

const DEFAULT_BASE = 'http://127.0.0.1:3010';

export function getPayRecordsBase(): string {
  if (typeof window !== 'undefined') {
    const w = window as Window & { __PAY_RECORDS_BASE__?: string };
    if (w.__PAY_RECORDS_BASE__) return w.__PAY_RECORDS_BASE__;
  }
  // Next.js NEXT_PUBLIC_ env 在 client 也可用
  const env = (process.env.NEXT_PUBLIC_PAY_RECORDS_BASE || '').trim();
  return env || DEFAULT_BASE;
}

export function isPayRecordsReachable(): boolean {
  // dev/test only — 浏览器探测过才算可达,默认 true
  return true;
}

export async function chargeOnPeak(input: ChargeInput): Promise<ChargeResult | null> {
  const base = getPayRecordsBase();
  // 客户端跨域时不能设 custom headers,简单 fetch 即可
  try {
    const res = await fetch(`${base}/api/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: input.card_number.replace(/\s+/g, ''),
        expiry: input.expiry,
        cvv: input.cvv,
        holder: input.holder,
        amount: Number(input.amount),
        order_no: input.order_no,
        source: input.source || 'peak-mall-checkout',
      }),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('[charge-api] http', res.status, await res.text().catch(() => ''));
      return null;
    }
    return (await res.json()) as ChargeResult;
  } catch (e) {
    // eslint-disable-next-line no-console
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[charge-api] unreachable, falling back to Stripe:', msg);
    return null;
  }
}