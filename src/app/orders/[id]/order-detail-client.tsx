'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  UserShell,
} from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import type { Order } from '@/lib/store';

const STATUS_LABEL: Record<Order['status'], { zh: string; en: string; cls: string }> = {
  pending:   { zh: '待支付', en: 'Pending payment', cls: 'bg-amber-100 text-amber-700' },
  paid:      { zh: '已支付', en: 'Paid',            cls: 'bg-blue-100 text-blue-700' },
  shipped:   { zh: '已发货', en: 'Shipped',         cls: 'bg-violet-100 text-violet-700' },
  delivered: { zh: '已收货', en: 'Delivered',       cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { zh: '已取消', en: 'Cancelled',       cls: 'bg-ink-200 text-ink-600' },
};

const STATUS_T_KEY: Record<Order['status'], keyof ReturnType<typeof useT>['orderDetail']> = {
  pending:   'statusPending',
  paid:      'statusPaid',
  shipped:   'statusShipped',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

interface Props {
  demoOrder: Order;
}

export default function OrderDetailClient({ demoOrder }: Props) {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('order-detail');
  const [copied, setCopied] = useState(false);

  const isEn = chrome.isEn;
  const o = demoOrder;
  const s = STATUS_LABEL[o.status];
  const shippingFee = o.total >= 50 ? 0 : 5;
  const subtotal = o.total - shippingFee;
  const itemCount = o.items.reduce((sum, i) => sum + i.qty, 0);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(o.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <>

      <UserShell>
        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-[28px] font-extrabold text-ink-900 leading-tight">
              {t.orderDetail.title}
            </h1>
            <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${s.cls}`}>
              {isEn ? s.en : s.zh}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
            <span className="font-mono">{o.id}</span>
            <button
              onClick={onCopy}
              aria-label={t.orderDetail.copyOrderId}
              className="px-2.5 py-1 text-[11.5px] text-ink-600 hover:text-orange-700 border border-ink-200 rounded transition-colors"
            >
              {copied ? t.orderDetail.copied : t.orderDetail.copyOrderId}
            </button>
            <span>·</span>
            <span>{new Date(o.createdAt).toISOString().slice(0, 10)}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <section className="lg:col-span-2 bg-white rounded-xl border border-ink-100 overflow-hidden">
            <h2 className="px-5 py-4 text-[15px] font-bold text-ink-900 border-b border-ink-100">
              {t.orderDetail.sectionItems} · {t.orderDetail.itemCount(itemCount)}
            </h2>
            <ul className="divide-y divide-ink-100">
              {o.items.map((it) => (
                <li key={it.productId} className="px-5 py-4 flex gap-4">
                  <button
                    onClick={() => router.push(`/shop/${it.productId}`)}
                    className="w-20 h-20 rounded-lg bg-ink-100 overflow-hidden flex-shrink-0"
                  >
                    {it.cover?.startsWith('/') || it.cover?.startsWith('http') ? (
                      <Image
                        src={it.cover}
                        alt={it.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[28px]">📦</div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => router.push(`/shop/${it.productId}`)}
                      className="text-[14px] font-semibold text-ink-900 hover:text-orange-700 transition-colors text-left line-clamp-2"
                    >
                      {it.name}
                    </button>
                    <div className="text-[12.5px] text-ink-500 mt-1">× {it.qty}</div>
                  </div>
                  <div className="text-[14px] font-bold text-orange-700">
                    ${(it.price * it.qty).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Right: payment + summary */}
          <div className="space-y-5">
            {/* Payment */}
            {o.payment && (
              <section className="bg-white rounded-xl p-5 border border-ink-100">
                <h2 className="text-[15px] font-bold text-ink-900 mb-3">
                  {t.orderDetail.sectionPayment}
                </h2>
                <dl className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Brand</dt>
                    <dd className="font-semibold text-ink-900">{o.payment.brand}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">BIN</dt>
                    <dd className="font-mono text-ink-900">{o.payment.bin}•••••{o.payment.last4}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Method</dt>
                    <dd className="text-ink-900 capitalize">{o.payment.method}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Status</dt>
                    <dd className="font-semibold text-ink-900">{o.payment.status}</dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Summary */}
            <aside className="bg-white rounded-xl p-5 border border-ink-100 h-fit">
              <h2 className="text-[15px] font-bold text-ink-900 mb-3">
                {t.orderDetail.total}
              </h2>
              <div className="space-y-2.5 text-[13.5px] mb-4">
                <div className="flex justify-between text-ink-600">
                  <span>{t.orderDetail.subtotal}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>{t.orderDetail.shipping}</span>
                  <span className={shippingFee === 0 ? 'text-emerald-700 font-semibold' : ''}>
                    {shippingFee === 0 ? '$0.00' : `$${shippingFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-ink-100 pt-2.5 flex justify-between text-[16px] font-extrabold text-ink-900">
                  <span>{t.orderDetail.total}</span>
                  <span className="text-orange-700">${o.total.toFixed(2)}</span>
                </div>
              </div>
              {o.status === 'pending' && (
                <button
                  onClick={() => router.push(`/pay/${o.id}`)}
                  className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white text-[13.5px] font-bold rounded-md transition-colors mb-2"
                >
                  {t.orderDetail.payNow}
                </button>
              )}
              <button
                onClick={() => router.push('/orders')}
                className="w-full py-2.5 text-[12.5px] text-ink-500 hover:text-ink-900 transition-colors"
              >
                ← {t.orders?.title ?? 'My orders'}
              </button>
            </aside>
          </div>
        </div>
      </UserShell>

    </>
  );
}