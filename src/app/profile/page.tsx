'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  UserShell,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

type SectionItem = { labelZh: string; labelEn: string; path: string; emoji: string };
type Section = { headingZh: string; headingEn: string; items: SectionItem[] };

function buildSections(t: ReturnType<typeof useT>): Section[] {
  return [
    {
      headingZh: '订单与购买',
      headingEn: 'Orders & buying',
      items: [
        { labelZh: t.profile.myOrders, labelEn: 'My orders', path: '/orders', emoji: '📦' },
        { labelZh: t.profile.cart, labelEn: 'Cart', path: '/cart', emoji: '🛒' },
        { labelZh: t.profile.myWishlist, labelEn: 'Wishlist', path: '/wishlist', emoji: '♡' },
        { labelZh: '售后记录', labelEn: 'After-sales', path: '/ref-peak-mall', emoji: '🛠' },
      ],
    },
    {
      headingZh: '账户与安全',
      headingEn: 'Account & security',
      items: [
        { labelZh: t.security.changePassword, labelEn: 'Change password', path: '/security/password', emoji: '🔑' },
        { labelZh: t.security.changeFundPassword, labelEn: 'Fund password', path: '/security/fund-password', emoji: '🔒' },
        { labelZh: '收货地址', labelEn: 'Addresses', path: '/address', emoji: '📍' },
        { labelZh: t.profile.settings, labelEn: 'Settings', path: '#', emoji: '⚙️' },
      ],
    },
    {
      headingZh: '钱包与分润',
      headingEn: 'Wallet & earnings',
      items: [
        { labelZh: t.commissions.title, labelEn: 'Commissions', path: '/commissions', emoji: '📊' },
        { labelZh: t.withdraw.title, labelEn: 'Withdraw', path: '/withdraw', emoji: '💳' },
        { labelZh: t.withdrawAddress.title, labelEn: 'Withdraw address', path: '/withdraw-address', emoji: '🏦' },
        { labelZh: t.team.title, labelEn: 'My team', path: '/team', emoji: '👥' },
      ],
    },
  ];
}

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('profile');
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  const orderCount = usePeakStore((s) => s.orders.length);
  const orders = usePeakStore((s) => s.orders);
  const recentOrders = useMemo(() => orders.slice(-3).reverse(), [orders]);

  return (
    <UserShell>
      <h1 className="text-[28px] font-bold text-ink-900 mb-6">{t.profile.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Sidebar — user card (flat) */}
        <aside className="bg-white rounded-xl border border-ink-100 md:col-span-1 overflow-hidden">
          {/* Accent top strip */}
          <div className="h-1.5 bg-orange-700" aria-hidden="true" />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-ink-100 flex items-center justify-center text-[26px]">
                👤
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-ink-900 truncate">
                    {chrome.isEn ? 'Guest user' : '访客用户'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-700/10 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded">
                    <span className="w-1 h-1 rounded-full bg-teal-700" />
                    {chrome.isEn ? 'Guest' : '游客'}
                  </span>
                </div>
                <div className="text-[11.5px] text-ink-500 mt-1 font-mono">
                  ID: GUEST-9384
                </div>
              </div>
            </div>
            <p className="text-[13px] text-ink-600 leading-relaxed mb-5">{t.profile.notLoggedIn}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 bg-orange-700 text-white text-[13px] font-bold rounded-md hover:bg-orange-800 transition-colors"
            >
              {chrome.isEn ? 'Sign in' : t.profile.goLogin} →
            </button>
          </div>
        </aside>

        {/* Right column */}
        <div className="md:col-span-2 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 transition-colors"
            >
              <div className="text-[11px] tracking-[2px] uppercase text-ink-500 mb-1">
                {t.profile.myOrders}
              </div>
              <div className="text-[28px] font-bold text-ink-900 leading-none">{orderCount}</div>
              <div className="text-[11px] text-orange-700 mt-2">→ {chrome.isEn ? 'View all' : '查看全部'}</div>
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 transition-colors"
            >
              <div className="text-[11px] tracking-[2px] uppercase text-ink-500 mb-1">
                {t.profile.cart}
              </div>
              <div className="text-[28px] font-bold text-ink-900 leading-none">{cartCount}</div>
              <div className="text-[11px] text-orange-700 mt-2">→ {chrome.isEn ? 'Checkout' : '去结算'}</div>
            </button>
            <button
              onClick={() => router.push('/wishlist')}
              className="bg-white rounded-xl border border-ink-100 p-4 text-left hover:border-ink-300 transition-colors"
            >
              <div className="text-[11px] tracking-[2px] uppercase text-ink-500 mb-1">
                {t.profile.myWishlist}
              </div>
              <div className="text-[28px] font-bold text-ink-900 leading-none">{wishCount}</div>
              <div className="text-[11px] text-orange-700 mt-2">→ {chrome.isEn ? 'Browse' : '逛逛'}</div>
            </button>
          </div>

          {/* Recent orders (real store data) */}
          <section className="bg-white rounded-xl border border-ink-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-ink-900">
                {chrome.isEn ? 'Recent orders' : '最近订单'}
              </h2>
              <Link href="/orders" className="text-[11px] text-orange-700 font-semibold hover:text-orange-800">
                {chrome.isEn ? 'See all' : '查看全部'} →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-[36px] mb-2">📭</div>
                <div className="text-[13px] text-ink-500">
                  {chrome.isEn ? 'No orders yet — your purchases will show up here.' : '还没有订单 — 购买后将在此显示。'}
                </div>
              </div>
            ) : (
              <ul>
                {recentOrders.map((o, i) => (
                  <li
                    key={o.id}
                    className="px-5 py-3 border-b border-ink-100 last:border-b-0 flex items-center gap-3 hover:bg-ink-50 transition-colors"
                  >
                    <span className="font-mono text-[12px] text-ink-500 w-20 truncate">#{o.id}</span>
                    <span className="flex-1 text-[13px] text-ink-900 truncate">{o.items?.[0]?.name ?? '—'}</span>
                    <span className="text-[12px] text-ink-500">{new Date(o.createdAt).toISOString().slice(0, 10)}</span>
                    <span className="text-[12px] font-bold text-ink-900">${o.total?.toFixed?.(2) ?? '0.00'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Functional groups */}
          {buildSections(t).map((sec) => (
            <section key={sec.headingZh} aria-label={chrome.isEn ? sec.headingEn : sec.headingZh} className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              <h2 className="px-5 py-3 border-b border-ink-100 text-[11px] tracking-[2px] uppercase text-ink-500 font-semibold">
                {chrome.isEn ? sec.headingEn : sec.headingZh}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4">
                {sec.items.map((it, i) => (
                  <button
                    key={i}
                    onClick={() => it.path !== '#' && router.push(it.path)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink-50 transition-colors text-left border-b border-ink-100 md:border-b-0 [&:nth-child(odd)]:md:border-r [&:nth-last-child(-n+2)]:md:border-b-0 border-r-0"
                  >
                    <span className="text-[18px] flex-shrink-0">{it.emoji}</span>
                    <span className="flex-1 text-[12.5px] font-semibold text-ink-900 truncate">
                      {chrome.isEn ? it.labelEn : it.labelZh}
                    </span>
                    <span className="text-ink-300 text-[14px]">→</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </UserShell>
  );
}
