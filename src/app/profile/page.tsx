'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  type CurrencyCode,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'orders', label: '我的订单' },
];

const CURRENCY_OPTIONS = [{ code: 'USD' as CurrencyCode, label: 'USD 美元' }];

export default function ProfilePage() {
  const router = useRouter();
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  const orderCount = usePeakStore((s) => s.orders.length);

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
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{COPY.profile.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sidebar / stats */}
          <aside className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6 md:p-7 md:col-span-1 shadow-soft">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-[26px]">
                👤
              </div>
              <div>
                <div className="text-[15px] font-bold">访客用户</div>
                <div className="text-[11.5px] opacity-80 mt-0.5">{COPY.profile.memberSince}: 2026</div>
              </div>
            </div>
            <p className="text-[13px] opacity-90 leading-relaxed mb-5">{COPY.profile.notLoggedIn}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 bg-white text-orange-700 text-[13px] font-extrabold rounded-md hover:bg-ink-50 transition-colors"
            >
              {COPY.profile.goLogin} →
            </button>
          </aside>

          {/* Right column */}
          <div className="md:col-span-2 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-orange-700">{orderCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{COPY.profile.myOrders}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-rose-700">{wishCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{COPY.profile.myWishlist}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-accent-teal">{cartCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{COPY.profile.cart}</div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-ink-100 text-[13px] font-bold text-ink-900">{COPY.profile.quickLinks}</div>
              {[
                { label: COPY.profile.myOrders, path: '/orders', emoji: '📦', hint: `${orderCount}` },
                { label: COPY.profile.myWishlist, path: '/wishlist', emoji: '♡', hint: `${wishCount}` },
                { label: COPY.profile.cart, path: '/cart', emoji: '🛒', hint: `${cartCount}` },
                { label: COPY.profile.settings, path: '#', emoji: '⚙️', hint: '' },
              ].map((l, i) => (
                <button
                  key={i}
                  onClick={() => l.path !== '#' && router.push(l.path)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left border-b border-ink-100 last:border-b-0"
                >
                  <span className="text-[18px]">{l.emoji}</span>
                  <span className="flex-1 text-[13.5px] font-medium text-ink-900">{l.label}</span>
                  {l.hint && <span className="text-[11px] text-ink-500">{l.hint}</span>}
                  <span className="text-ink-300">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
