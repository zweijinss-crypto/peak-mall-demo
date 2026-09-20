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

type SectionItem = { labelZh: string; labelEn: string; path: string; emoji: string; hint?: string };
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
      {/* Banner — identity is the first thing on screen */}
      <section className="bg-white rounded-xl border border-ink-100 overflow-hidden mb-5">
        <div className="h-1.5 bg-orange-700" aria-hidden="true" />
        <div className="px-6 py-6 md:py-7 md:px-8 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-ink-100 flex items-center justify-center text-[32px] flex-shrink-0">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] md:text-[26px] font-bold text-ink-900 leading-tight">
                  {chrome.isEn ? 'Guest user' : '访客用户'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-700/10 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded">
                  <span className="w-1 h-1 rounded-full bg-teal-700" />
                  {chrome.isEn ? 'Guest' : '游客'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[12px] text-ink-500">
                <span className="font-mono">ID: GUEST-9384</span>
                <span className="w-1 h-1 rounded-full bg-ink-300" />
                <span>{t.profile.memberSince}: 2026</span>
              </div>
              <p className="text-[13px] text-ink-600 mt-2">{t.profile.notLoggedIn}</p>
            </div>
          </div>
          <div className="flex md:flex-col gap-2 md:items-end md:flex-shrink-0">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 bg-orange-700 text-white text-[13px] font-bold rounded-md hover:bg-orange-800 transition-colors"
            >
              {chrome.isEn ? 'Sign in' : t.profile.goLogin} →
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-2.5 bg-white text-ink-900 border border-ink-900 text-[13px] font-bold rounded-md hover:bg-ink-900 hover:text-white transition-colors"
            >
              {chrome.isEn ? 'Create account' : '注册账户'}
            </button>
          </div>
        </div>
      </section>

      {/* Stat row — clickable cards pointing to deeper pages */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <button
          onClick={() => router.push('/orders')}
          className="bg-white rounded-xl border border-ink-100 p-5 text-left hover:border-ink-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[2px] uppercase text-ink-500">{t.profile.myOrders}</span>
            <span className="text-[18px]" aria-hidden="true">📦</span>
          </div>
          <div className="text-[32px] font-bold text-ink-900 leading-none">{orderCount}</div>
          <div className="text-[11px] text-orange-700 mt-3 font-semibold">→ {chrome.isEn ? 'View all' : '查看全部'}</div>
        </button>
        <button
          onClick={() => router.push('/cart')}
          className="bg-white rounded-xl border border-ink-100 p-5 text-left hover:border-ink-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[2px] uppercase text-ink-500">{t.profile.cart}</span>
            <span className="text-[18px]" aria-hidden="true">🛒</span>
          </div>
          <div className="text-[32px] font-bold text-ink-900 leading-none">{cartCount}</div>
          <div className="text-[11px] text-orange-700 mt-3 font-semibold">→ {chrome.isEn ? 'Checkout' : '去结算'}</div>
        </button>
        <button
          onClick={() => router.push('/wishlist')}
          className="bg-white rounded-xl border border-ink-100 p-5 text-left hover:border-ink-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[2px] uppercase text-ink-500">{t.profile.myWishlist}</span>
            <span className="text-[18px]" aria-hidden="true">♡</span>
          </div>
          <div className="text-[32px] font-bold text-ink-900 leading-none">{wishCount}</div>
          <div className="text-[11px] text-orange-700 mt-3 font-semibold">→ {chrome.isEn ? 'Browse' : '逛逛'}</div>
        </button>
        <button
          onClick={() => router.push('/commissions')}
          className="bg-white rounded-xl border border-ink-100 p-5 text-left hover:border-ink-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[2px] uppercase text-ink-500">{chrome.isEn ? 'Earnings' : '钱包余额'}</span>
            <span className="text-[18px]" aria-hidden="true">💰</span>
          </div>
          <div className="text-[32px] font-bold text-ink-900 leading-none">$0.00</div>
          <div className="text-[11px] text-orange-700 mt-3 font-semibold">→ {chrome.isEn ? 'Withdraw' : '去提现'}</div>
        </button>
      </div>

      {/* Main 2-column: recent orders (1) + functional groups column (2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent orders — narrower, takes 1/3 on lg */}
        <section className="bg-white rounded-xl border border-ink-100 overflow-hidden lg:col-span-1">
          <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-ink-900">
              {chrome.isEn ? 'Recent orders' : '最近订单'}
            </h2>
            <Link href="/orders" className="text-[11px] text-orange-700 font-semibold hover:text-orange-800">
              {chrome.isEn ? 'See all' : '查看全部'} →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-[44px] mb-3" aria-hidden="true">📭</div>
              <div className="text-[13px] text-ink-700 font-semibold mb-1">
                {chrome.isEn ? 'No orders yet' : '还没有订单'}
              </div>
              <div className="text-[12px] text-ink-500 mb-4 leading-relaxed">
                {chrome.isEn
                  ? 'Your purchases will show up here once you place your first order.'
                  : '购买后将在此显示。'}
              </div>
              <button
                onClick={() => router.push('/')}
                className="text-[12px] font-bold text-orange-700 hover:text-orange-800"
              >
                {chrome.isEn ? 'Start shopping →' : '去逛逛 →'}
              </button>
            </div>
          ) : (
            <ul>
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="px-5 py-3.5 border-b border-ink-100 last:border-b-0 hover:bg-ink-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/orders`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11.5px] text-ink-500">#{o.id}</span>
                    <span className="text-[12px] text-ink-500">{new Date(o.createdAt).toISOString().slice(0, 10)}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-ink-900 truncate mb-1">{o.items?.[0]?.name ?? '—'}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-ink-500">{o.status}</span>
                    <span className="text-[13px] font-bold text-ink-900">${o.total?.toFixed?.(2) ?? '0.00'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Functional groups — 2/3 on lg, 3 sections stacked */}
        <div className="lg:col-span-2 space-y-5">
          {buildSections(t).map((sec) => (
            <section key={sec.headingZh} aria-label={chrome.isEn ? sec.headingEn : sec.headingZh} className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
                <h2 className="text-[11px] tracking-[2px] uppercase text-ink-500 font-semibold">
                  {chrome.isEn ? sec.headingEn : sec.headingZh}
                </h2>
                <span className="text-[11px] text-ink-500">
                  {sec.items.length} {chrome.isEn ? 'items' : '项'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4">
                {sec.items.map((it, i) => (
                  <button
                    key={i}
                    onClick={() => it.path !== '#' && router.push(it.path)}
                    className="flex flex-col items-start gap-2 px-5 py-4 hover:bg-ink-50 transition-colors text-left border-b border-ink-100 md:border-b-0 [&:nth-child(odd)]:md:border-r [&:nth-child(even)]:md:border-r-0 [&:nth-last-child(-n+2)]:md:border-b-0"
                  >
                    <span className="text-[24px]" aria-hidden="true">{it.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink-900 truncate">
                        {chrome.isEn ? it.labelEn : it.labelZh}
                      </div>
                      <div className="text-[11px] text-orange-700 mt-0.5">{chrome.isEn ? 'Open' : '进入'} →</div>
                    </div>
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
