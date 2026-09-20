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

type QuickItem = { labelZh: string; labelEn: string; path: string; emoji: string; group: 'orders' | 'account' | 'wallet' };

function buildQuickItems(t: ReturnType<typeof useT>): QuickItem[] {
  return [
    { group: 'orders', labelZh: t.profile.myOrders, labelEn: 'My orders', path: '/orders', emoji: '📦' },
    { group: 'orders', labelZh: t.profile.cart, labelEn: 'Cart', path: '/cart', emoji: '🛒' },
    { group: 'orders', labelZh: t.profile.myWishlist, labelEn: 'Wishlist', path: '/wishlist', emoji: '♡' },
    { group: 'orders', labelZh: '售后记录', labelEn: 'After-sales', path: '/ref-peak-mall', emoji: '🛠' },
    { group: 'account', labelZh: t.security.changePassword, labelEn: 'Change password', path: '/security/password', emoji: '🔑' },
    { group: 'account', labelZh: t.security.changeFundPassword, labelEn: 'Fund password', path: '/security/fund-password', emoji: '🔒' },
    { group: 'account', labelZh: '收货地址', labelEn: 'Addresses', path: '/address', emoji: '📍' },
    { group: 'account', labelZh: t.profile.settings, labelEn: 'Settings', path: '#', emoji: '⚙️' },
    { group: 'wallet', labelZh: t.commissions.title, labelEn: 'Commissions', path: '/commissions', emoji: '📊' },
    { group: 'wallet', labelZh: t.withdraw.title, labelEn: 'Withdraw', path: '/withdraw', emoji: '💳' },
    { group: 'wallet', labelZh: t.withdrawAddress.title, labelEn: 'Withdraw address', path: '/withdraw-address', emoji: '🏦' },
    { group: 'wallet', labelZh: t.team.title, labelEn: 'My team', path: '/team', emoji: '👥' },
  ];
}

const GROUP_META: Record<QuickItem['group'], { headingZh: string; headingEn: string }> = {
  orders: { headingZh: '订单与购买', headingEn: 'Orders & buying' },
  account: { headingZh: '账户与安全', headingEn: 'Account & security' },
  wallet: { headingZh: '钱包与分润', headingEn: 'Wallet & earnings' },
};

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('profile');
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  const orderCount = usePeakStore((s) => s.orders.length);
  const orders = usePeakStore((s) => s.orders);
  const recentOrders = useMemo(() => orders.slice(-3).reverse(), [orders]);
  const quickItems = useMemo(() => buildQuickItems(t), [t]);
  const groups: QuickItem['group'][] = ['orders', 'account', 'wallet'];

  return (
    <UserShell>
      {/* Banner — identity is the first thing on screen */}
      <section className="bg-white border border-ink-100 overflow-hidden mb-4">
        <div className="h-1 bg-orange-700" aria-hidden="true" />
        <div className="px-5 py-4 md:py-5 md:px-6 flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-ink-100 flex items-center justify-center text-[24px] flex-shrink-0">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] md:text-[20px] font-bold text-ink-900 leading-tight">
                {chrome.isEn ? 'Guest user' : '访客用户'}
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-700/10 text-teal-700 text-[10px] font-semibold uppercase tracking-wider rounded">
                <span className="w-1 h-1 rounded-full bg-teal-700" />
                {chrome.isEn ? 'Guest' : '游客'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
              <span className="font-mono">ID: GUEST-9384</span>
              <span className="w-0.5 h-0.5 rounded-full bg-ink-300" />
              <span>{t.profile.memberSince}: 2026</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-orange-700 text-white text-[12px] font-bold hover:bg-orange-800 transition-colors"
            >
              {chrome.isEn ? 'Sign in' : t.profile.goLogin}
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-4 py-2 bg-white text-ink-900 border border-ink-900 text-[12px] font-bold hover:bg-ink-900 hover:text-white transition-colors"
            >
              {chrome.isEn ? 'Create account' : '注册账户'}
            </button>
          </div>
        </div>
      </section>

      {/* Stat row — inline strip, no card frames */}
      <div className="grid grid-cols-4 bg-white border border-ink-100 divide-x divide-ink-100 mb-4">
        <button onClick={() => router.push('/orders')} className="px-4 py-3 text-left hover:bg-ink-50 transition-colors">
          <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-1">{t.profile.myOrders}</div>
          <div className="text-[20px] font-bold text-ink-900 leading-none">{orderCount}</div>
        </button>
        <button onClick={() => router.push('/cart')} className="px-4 py-3 text-left hover:bg-ink-50 transition-colors">
          <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-1">{t.profile.cart}</div>
          <div className="text-[20px] font-bold text-ink-900 leading-none">{cartCount}</div>
        </button>
        <button onClick={() => router.push('/wishlist')} className="px-4 py-3 text-left hover:bg-ink-50 transition-colors">
          <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-1">{t.profile.myWishlist}</div>
          <div className="text-[20px] font-bold text-ink-900 leading-none">{wishCount}</div>
        </button>
        <button onClick={() => router.push('/commissions')} className="px-4 py-3 text-left hover:bg-ink-50 transition-colors">
          <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-1">{chrome.isEn ? 'Earnings' : '钱包余额'}</div>
          <div className="text-[20px] font-bold text-ink-900 leading-none">$0.00</div>
        </button>
      </div>

      {/* Main 2-column: recent orders (narrow) + flat quick-links grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent orders — narrower, takes 1/3 on lg */}
        <section className="bg-white border border-ink-100 overflow-hidden lg:col-span-1">
          <div className="px-4 py-2.5 border-b border-ink-100 flex items-center justify-between">
            <h2 className="text-[12px] font-bold text-ink-900">
              {chrome.isEn ? 'Recent orders' : '最近订单'}
            </h2>
            <Link href="/orders" className="text-[11px] text-orange-700 font-semibold hover:text-orange-800">
              {chrome.isEn ? 'See all' : '查看全部'} →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-[36px] mb-2" aria-hidden="true">📭</div>
              <div className="text-[12px] text-ink-700 font-semibold mb-3">
                {chrome.isEn ? 'No orders yet' : '还没有订单'}
              </div>
              <button
                onClick={() => router.push('/')}
                className="text-[11px] font-bold text-orange-700 hover:text-orange-800"
              >
                {chrome.isEn ? 'Start shopping →' : '去逛逛 →'}
              </button>
            </div>
          ) : (
            <ul>
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="px-4 py-3 border-b border-ink-100 last:border-b-0 hover:bg-ink-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/orders`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-ink-500">#{o.id}</span>
                    <span className="text-[11px] text-ink-500">{new Date(o.createdAt).toISOString().slice(0, 10)}</span>
                  </div>
                  <div className="text-[12.5px] font-semibold text-ink-900 truncate mb-1">{o.items?.[0]?.name ?? '—'}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-ink-500">{o.status}</span>
                    <span className="text-[12.5px] font-bold text-ink-900">${o.total?.toFixed?.(2) ?? '0.00'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick links — single flat grid, grouped by column heading */}
        <section className="bg-white border border-ink-100 overflow-hidden lg:col-span-2">
          <div className="px-4 py-2.5 border-b border-ink-100">
            <h2 className="text-[12px] font-bold text-ink-900">
              {chrome.isEn ? 'Quick links' : '快捷入口'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-ink-100">
            {groups.map((g) => (
              <div key={g} className="px-4 py-3">
                <h3 className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-semibold mb-2">
                  {chrome.isEn ? GROUP_META[g].headingEn : GROUP_META[g].headingZh}
                </h3>
                <ul>
                  {quickItems.filter((it) => it.group === g).map((it, i) => (
                    <li key={i}>
                      <button
                        onClick={() => it.path !== '#' && router.push(it.path)}
                        className="w-full flex items-center gap-2.5 py-2 text-left hover:text-orange-700 transition-colors group"
                      >
                        <span className="text-[15px]" aria-hidden="true">{it.emoji}</span>
                        <span className="text-[12.5px] font-semibold text-ink-900 group-hover:text-orange-700 flex-1 truncate">
                          {chrome.isEn ? it.labelEn : it.labelZh}
                        </span>
                        <span className="text-[11px] text-ink-400 group-hover:text-orange-700">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </UserShell>
  );
}
