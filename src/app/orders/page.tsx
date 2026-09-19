'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  type CurrencyCode,
} from '@/components/peak-mall';
import { usePeakStore, type Order } from '@/lib/store';
import { COPY } from '@/lib/copy';

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'orders', label: '我的订单' },
];

const CURRENCY_OPTIONS = [{ code: 'USD' as CurrencyCode, label: 'USD 美元' }];

const STATUS_MAP = {
  pending: { label: COPY.orders.statusPending, color: 'bg-amber-100 text-amber-700' },
  paid: { label: COPY.orders.statusPaid, color: 'bg-blue-100 text-blue-700' },
  shipped: { label: COPY.orders.statusShipped, color: 'bg-violet-100 text-violet-700' },
  delivered: { label: COPY.orders.statusDelivered, color: 'bg-emerald-100 text-emerald-700' },
} as const;

export default function OrdersPage() {
  const router = useRouter();
  const orders = usePeakStore((s) => s.orders);

  return (
    <>
      <AnnouncementBar tag="公告" text="全场满 $50 包邮 · 7 天无理由退换" />
      <ShopHeader
        brand={{ name: COPY.brand.name, slogan: COPY.brand.slogan }}
        navItems={NAV_ITEMS}
        active="orders"
        currencyOptions={CURRENCY_OPTIONS}
        currency="USD"
        onCurrencyChange={() => {}}
        langOptions={[{ code: 'zh', label: '中文' }, { code: 'en', label: 'EN' }]}
        lang="zh"
        onLangChange={() => {}}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{COPY.orders.title}</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
            <div className="text-[64px] mb-4">📦</div>
            <div className="text-[18px] font-bold text-ink-900 mb-2">{COPY.orders.empty}</div>
            <div className="text-[13.5px] text-ink-500 mb-6">{COPY.orders.emptyDesc}</div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white text-[14px] font-bold rounded-md transition-colors"
            >
              {COPY.orders.startShopping}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o: Order) => {
              const st = STATUS_MAP[o.status];
              return (
                <article key={o.id} className="bg-white rounded-xl border border-ink-100 overflow-hidden">
                  <header className="flex flex-wrap items-center gap-3 px-5 py-3 bg-ink-50 border-b border-ink-100 text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-500">{COPY.orders.placedAt}:</span>
                      <span className="font-semibold text-ink-900">{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-500">{COPY.orders.orderId}:</span>
                      <span className="font-mono font-semibold text-ink-900">{o.id}</span>
                    </div>
                    <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${st.color}`}>
                      {st.label}
                    </span>
                  </header>

                  <div className="p-5 space-y-3">
                    {o.items.map((it) => (
                      <div key={it.productId} className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-ink-100 overflow-hidden flex-shrink-0">
                          {it.cover?.startsWith('/') || it.cover?.startsWith('http') ? (
                            <img src={it.cover} alt={it.name} width="80" height="80" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[24px]">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => router.push(`/shop/${it.productId}`)}
                            className="text-[14px] font-semibold text-ink-900 hover:text-orange-700 transition-colors line-clamp-1 text-left"
                          >
                            {it.name}
                          </button>
                          <div className="text-[12px] text-ink-500 mt-0.5">× {it.qty}</div>
                        </div>
                        <div className="text-[14.5px] font-bold text-orange-700">${(it.price * it.qty).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <footer className="flex justify-between items-center px-5 py-3.5 bg-ink-50 border-t border-ink-100">
                    <span className="text-[12.5px] text-ink-500">
                      {COPY.orders.itemCount(o.items.reduce((s, i) => s + i.qty, 0))}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-[13px] text-ink-600">
                        {COPY.orders.amount}: <b className="text-orange-700 text-[16px]">${o.total.toFixed(2)}</b>
                      </span>
                      <button
                        onClick={() => router.push(`/shop/${o.items[0].productId}`)}
                        className="text-[12.5px] font-semibold text-orange-700 hover:text-primary-dark transition-colors"
                      >
                        {COPY.orders.viewDetail} →
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
