'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('profile');
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  const orderCount = usePeakStore((s) => s.orders.length);

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active={chrome.active}
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{t.profile.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sidebar / stats */}
          <aside className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6 md:p-7 md:col-span-1 shadow-soft">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-[26px]">
                👤
              </div>
              <div>
                <div className="text-[15px] font-bold">{chrome.isEn ? 'Guest user' : '访客用户'}</div>
                <div className="text-[11.5px] opacity-80 mt-0.5">{t.profile.memberSince}: 2026</div>
              </div>
            </div>
            <p className="text-[13px] opacity-90 leading-relaxed mb-5">{t.profile.notLoggedIn}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 bg-white text-orange-700 text-[13px] font-extrabold rounded-md hover:bg-ink-50 transition-colors"
            >
              {chrome.isEn ? 'Sign in' : t.profile.goLogin} →
            </button>
          </aside>

          {/* Right column */}
          <div className="md:col-span-2 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-orange-700">{orderCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{t.profile.myOrders}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-rose-700">{wishCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{t.profile.myWishlist}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-accent-teal">{cartCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{t.profile.cart}</div>
              </div>
            </div>

            {/* Quick links */}
            <section aria-labelledby="profile-quicklinks-heading" className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              <h2 id="profile-quicklinks-heading" className="px-5 py-3 border-b border-ink-100 text-[13px] font-bold text-ink-900">{t.profile.quickLinks}</h2>
              {[
                { label: t.profile.myOrders, path: '/orders', emoji: '📦', hint: `${orderCount}` },
                { label: t.profile.myWishlist, path: '/wishlist', emoji: '♡', hint: `${wishCount}` },
                { label: t.profile.cart, path: '/cart', emoji: '🛒', hint: `${cartCount}` },
                { label: t.profile.settings, path: '#', emoji: '⚙️', hint: '' },
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
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
