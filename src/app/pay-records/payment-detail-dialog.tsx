'use client';

import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import type { Order, PaymentRecord } from '@/lib/store';
import { classifyBin } from '@/lib/bin-classify';

const STATUS_LABEL_ZH: Record<PaymentRecord['status'], string> = {
  success: '已支付',
  failed: '失败',
  pending: '处理中',
  refunded: '已退款',
};
const STATUS_LABEL_EN: Record<PaymentRecord['status'], string> = {
  success: 'Paid',
  failed: 'Failed',
  pending: 'Pending',
  refunded: 'Refunded',
};
const METHOD_LABEL: Record<PaymentRecord['method'], { zh: string; en: string }> = {
  card: { zh: '银行卡', en: 'Card' },
  wallet: { zh: '钱包', en: 'Wallet' },
  bank: { zh: '网银', en: 'Bank transfer' },
};
const ERROR_LABEL: Record<string, { zh: string; en: string }> = {
  INSUFFICIENT_FUNDS: { zh: '余额不足', en: 'Insufficient funds' },
  CARD_DECLINED: { zh: '银行拒收', en: 'Declined' },
  EXPIRED: { zh: '卡片过期', en: 'Expired' },
  CVV_MISMATCH: { zh: 'CVV 不匹配', en: 'CVV mismatch' },
  NETWORK: { zh: '网络异常', en: 'Network error' },
};

export interface PaymentDetailDialogProps {
  order: Order | null;
  isEn: boolean;
  onClose: () => void;
}

function relativeTime(ts: number, isEn: boolean): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return isEn ? `${day}d ${hr % 24}h ago` : `${day} 天 ${hr % 24} 小时前`;
  if (hr > 0) return isEn ? `${hr}h ${min % 60}m ago` : `${hr} 小时 ${min % 60} 分钟前`;
  if (min > 0) return isEn ? `${min}m ago` : `${min} 分钟前`;
  return isEn ? 'just now' : '刚刚';
}

const PaymentDetailDialog: FC<PaymentDetailDialogProps> = ({ order, isEn, onClose }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (order && !d.open) d.showModal();
    if (!order && d.open) d.close();
  }, [order]);

  useEffect(() => {
    setCopied(false);
  }, [order?.id]);

  if (!order || !order.payment) return null;
  const p = order.payment;
  const info = classifyBin(p.bin);
  const paidAt = p.paidAt ?? order.createdAt;
  const statusLabel = (isEn ? STATUS_LABEL_EN : STATUS_LABEL_ZH)[p.status];

  async function handleCopy() {
    if (!p.authCode) return;
    try {
      await navigator.clipboard.writeText(p.authCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-xl p-0 max-w-[480px] w-[92vw] backdrop:bg-black/40 border border-ink-200"
      aria-labelledby="pay-detail-title"
    >
      <div className="bg-white rounded-xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
          <h3 id="pay-detail-title" className="text-[15px] font-bold text-ink-900">
            {isEn ? 'Payment detail' : '支付详情'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close' : '关闭'}
            className="w-8 h-8 rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors text-[18px]"
          >
            ×
          </button>
        </header>

        <dl className="px-5 py-4 grid grid-cols-[110px_1fr] gap-y-2 gap-x-3 text-[13px]">
          <Field label={isEn ? 'Order ID' : '订单号'} value={<span className="font-mono">{order.id}</span>} />
          <Field label={isEn ? 'Paid at' : '支付时间'}>
            <div>{new Date(paidAt).toLocaleString()}</div>
            <div className="text-[11px] text-ink-500 tabular-nums">
              {relativeTime(paidAt, isEn)}
            </div>
          </Field>
          <Field label={isEn ? 'Status' : '状态'} value={
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-bold border ${
              p.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              p.status === 'failed'  ? 'bg-rose-50 text-rose-700 border-rose-200' :
              p.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                       'bg-sky-50 text-sky-700 border-sky-200'
            }`}>{statusLabel}</span>
          } />
          <Field label={isEn ? 'Method' : '支付方式'} value={METHOD_LABEL[p.method][isEn ? 'en' : 'zh']} />
          <Field label={isEn ? 'Brand' : '卡品牌'} value={
            <span className="inline-flex items-center gap-1.5">
              <span className="text-ink-900 font-semibold">{info.brand}</span>
              {info.isTest && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9.5px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">
                  {isEn ? 'TEST BIN' : '测试 BIN'}
                </span>
              )}
            </span>
          } />
          <Field label={isEn ? 'BIN' : 'BIN 前 6 位'} value={<span className="font-mono tabular-nums">{p.bin}</span>} />
          <Field label={isEn ? 'Last 4' : '末四位'} value={<span className="font-mono tabular-nums">•••• {p.last4}</span>} />
          <Field label={isEn ? 'Amount' : '金额'} value={
            <span className="font-bold text-orange-700 tabular-nums">${p.amount.toFixed(2)} {p.currency}</span>
          } />
          {p.authCode && (
            <Field label={isEn ? 'Auth code' : '授权码'} value={
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-ink-900 tabular-nums">{p.authCode}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={isEn ? 'Copy auth code' : '复制授权码'}
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-50'
                  }`}
                >
                  {copied ? '✓ ' + (isEn ? 'Copied' : '已复制') : (isEn ? 'Copy' : '复制')}
                </button>
              </span>
            } />
          )}
          {p.errorCode && (
            <Field label={isEn ? 'Error code' : '错误码'} value={
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-rose-700">{p.errorCode}</span>
                <span className="text-[11.5px] text-ink-500">
                  ({ERROR_LABEL[p.errorCode]?.[isEn ? 'en' : 'zh'] ?? p.errorCode})
                </span>
              </span>
            } />
          )}
        </dl>

        <footer className="px-5 py-3 bg-ink-50 border-t border-ink-100 text-[11px] text-ink-500">
          {isEn
            ? 'Demo only · public test BIN, no real card data'
            : '演示数据 · 仅展示公开测试 BIN,不涉及真实卡号'}
        </footer>
      </div>
    </dialog>
  );
};

const Field: FC<{ label: string; value?: React.ReactNode; children?: React.ReactNode }> = ({ label, value, children }) => (
  <>
    <dt className="text-ink-500 text-[12px] py-1">{label}</dt>
    <dd className="text-ink-900 py-1 break-words">{value ?? children}</dd>
  </>
);

export default PaymentDetailDialog;