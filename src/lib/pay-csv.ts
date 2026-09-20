/**
 * pay-csv.ts — export payment records as CSV.
 *
 * Hard rules (skill: scrub-before-disk-credentialed-crawl):
 *   - Never export cardNumber / CVV / holder / address / phone / email
 *   - BIN is from public test BIN table only (demo)
 *   - last4 is from deterministic pseudo-random, never a real card tail
 *
 * Public fields only:
 *   orderId, paidAt, method, brand, bin, last4, amount, currency, status, errorCode, authCode
 */
import type { Order, PaymentRecord } from './store';

export interface PayCSVRow {
  orderId: string;
  paidAt: string;
  method: PaymentRecord['method'];
  brand: PaymentRecord['brand'];
  bin: string;
  last4: string;
  amount: number;
  currency: PaymentRecord['currency'];
  status: PaymentRecord['status'];
  errorCode?: PaymentRecord['errorCode'];
  authCode?: string;
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCSV(rows: PayCSVRow[]): string {
  const headers = [
    'orderId',
    'paidAt',
    'method',
    'brand',
    'bin',
    'last4',
    'amount',
    'currency',
    'status',
    'errorCode',
    'authCode',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.orderId,
        r.paidAt,
        r.method,
        r.brand,
        r.bin,
        r.last4,
        r.amount.toFixed(2),
        r.currency,
        r.status,
        r.errorCode ?? '',
        r.authCode ?? '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return lines.join('\n');
}

/**
 * 从 orders + payment 抽出可导出记录。
 * 没有 payment 的订单直接跳过(待支付订单没有导出必要)。
 */
export function buildPayCSVRows(orders: Order[]): PayCSVRow[] {
  const rows: PayCSVRow[] = [];
  for (const o of orders) {
    if (!o.payment) continue;
    const p = o.payment;
    rows.push({
      orderId: o.id,
      paidAt: new Date(p.paidAt ?? o.createdAt).toISOString(),
      method: p.method,
      brand: p.brand,
      bin: p.bin,
      last4: p.last4,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      errorCode: p.errorCode,
      authCode: p.authCode,
    });
  }
  return rows;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}