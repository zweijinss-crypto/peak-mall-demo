'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  type CurrencyCode,
  type Product,
} from '@/components/peak-mall';
import { PRODUCTS } from '@/data/products';
import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'orders', label: '我的订单' },
];

const CURRENCY_OPTIONS = [{ code: 'USD' as CurrencyCode, label: 'USD 美元' }];

export default function WishlistPage() {
  const router = useRouter();
  const wishlist = usePeakStore((s) => s.wishlist);
  const toggle = usePeakStore((s) => s.toggleWish);
  const addToCart = usePeakStore((s) => s.addToCart);

  const items: Array<Product & { addedAt: number }> = wishlist
    .map((w) => {
      const p = PRODUCTS.find((x) => x.id === w.id);
      return p ? { ...p, addedAt: w.addedAt } : null;
    })
    .filter((x): x is Product & { addedAt: number } => !!x);

  return (
    <>
      <AnnouncementBar tag="公告" text="全场满 $50 包邮 · 7 天无理由退换" />
      <ShopHeader
        brand={{ name: COPY.brand.name, slogan: COPY.brand.slogan }}
        navItems={NAV_ITEMS}
        active="home"
        currencyOptions={CURRENCY_OPTIONS}
        currency="USD"
        onCurrencyChange={() => {}}
        langOptions={[{ code: 'zh', label: '中文' }, { code: 'en', label: 'EN' }]}
        lang="zh"
        onLangChange={() => {}}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <div className="flex items-end justify-between mb-6">
          <h1 className="text-[28px] font-extrabold text-ink-900">{COPY.wishlist.title}</h1>
          {items.length > 0 && (
            <button
              onClick={() => items.forEach((it) => toggle(it.id))}
              className="text-[13px] text-rose-600 hover:text-rose-700 transition-colors"
            >
              {COPY.wishlist.removeAll}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
            <div className="text-[64px] mb-4">♡</div>
            <div className="text-[18px] font-bold text-ink-900 mb-2">{COPY.wishlist.empty}</div>
            <div className="text-[13.5px] text-ink-500 mb-6">{COPY.wishlist.emptyDesc}</div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white text-[14px] font-bold rounded-md transition-colors"
            >
              {COPY.cart.continue}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((p) => (
              <article key={p.id} className="bg-white rounded-xl overflow-hidden border border-ink-100 hover:shadow-float hover:-translate-y-1 transition-all">
                <button
                  onClick={() => router.push(`/shop/${p.id}`)}
                  className="block w-full aspect-square bg-ink-100"
                >
                  {p.cover?.startsWith('/') || p.cover?.startsWith('http') ? (
                    <img src={p.cover} alt={p.name} width="300" height="300" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[64px]">📦</div>
                  )}
                </button>
                <div className="p-3.5">
                  <button
                    onClick={() => router.push(`/shop/${p.id}`)}
                    className="block text-[13.5px] font-semibold text-ink-900 hover:text-primary transition-colors line-clamp-2 mb-1.5 min-h-[36px] text-left"
                  >
                    {p.name}
                  </button>
                  <div className="text-[10.5px] text-ink-600 mb-2">{COPY.wishlist.addedAt} {new Date(p.addedAt).toLocaleDateString()}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary text-[17px] font-extrabold">${p.price}</span>
                    <button
                      onClick={() => addToCart({ id: p.id, name: p.name, price: Number(p.price), cover: p.cover })}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-[11.5px] font-bold rounded-md transition-colors"
                    >
                      {COPY.wishlist.addToCart}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
