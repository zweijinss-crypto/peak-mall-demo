'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  UserShell,
  PageBanner,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { getCurrentUser, logout, type AuthUser } from '@/lib/auth';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('profile');
  const orderCount = usePeakStore((s) => s.orders.length);
  const orders = usePeakStore((s) => s.orders);
  const recentOrders = useMemo(() => orders.slice(-3).reverse(), [orders]);

  // G3: read real auth user from localStorage (avoids the always-$0.00 stats)
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // G4: real stats derived from store when logged in
  const walletBalance = useMemo(() => {
    if (!user) return '$0.00';
    // Demo: sum of completed/cancelled orders × 5% commission rate
    const sum = orders
      .filter((o) => o.status === 'delivered')
      .reduce((s, o) => s + o.total * 0.05, 0);
    return `$${sum.toFixed(2)}`;
  }, [user, orders]);
  const thisMonthCommission = useMemo(() => {
    if (!user) return '$0.00';
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sum = orders
      .filter((o) => o.createdAt >= monthStart && o.status === 'delivered')
      .reduce((s, o) => s + o.total * 0.05, 0);
    return `$${sum.toFixed(2)}`;
  }, [user, orders]);

  const displayName = user?.nickname || user?.email?.split('@')[0] || (chrome.isEn ? 'Guest user' : '访客用户');
  const memberSince = user
    ? new Date(user.loggedInAt).toLocaleDateString('en-CA') // YYYY-MM-DD
    : '—';
  const stats = user
    ? [
        { label: chrome.isEn ? 'Orders' : '订单数', value: orderCount },
        { label: chrome.isEn ? 'Wallet' : '钱包余额', value: walletBalance, tone: 'accent' as const },
        { label: chrome.isEn ? 'This month' : '本月佣金', value: thisMonthCommission },
        { label: chrome.isEn ? 'Member since' : '注册时间', value: memberSince },
      ]
    : [
        { label: chrome.isEn ? 'Orders' : '订单数', value: orderCount },
        { label: chrome.isEn ? 'Wallet' : '钱包余额', value: '$0.00', tone: 'accent' as const },
        { label: chrome.isEn ? 'This month' : '本月佣金', value: '$0.00' },
        { label: chrome.isEn ? 'Team' : '团队人数', value: 0 },
      ];

  return (
    <UserShell>
      {/* Member card — identity + dashboard stats */}
      <PageBanner
        title={displayName}
        subtitle={
          user
            ? (chrome.isEn ? 'Account overview' : '账户总览')
            : (chrome.isEn ? 'Sign in to access all features' : '登录后使用全部功能')
        }
        stats={stats}
        trailing={
          user ? (
            <button
              onClick={() => {
                logout();
                setUser(null);
                router.refresh();
              }}
              className="px-4 py-2 bg-white border border-ink-200 text-ink-700 text-[12px] font-bold hover:bg-ink-50 transition-colors flex-shrink-0"
            >
              {chrome.isEn ? 'Sign out' : '退出登录'}
            </button>
          ) : (
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
          )
        }
      />

      {/* Member meta — single tier line, skip when nothing meaningful to say */}
      <div className="flex items-center gap-2 mb-5 text-[11px] text-ink-500">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-semibold uppercase tracking-wider rounded ${
          user ? 'bg-emerald-700/10 text-emerald-700' : 'bg-teal-700/10 text-teal-700'
        }`}>
          <span className={`w-1 h-1 rounded-full ${user ? 'bg-emerald-700' : 'bg-teal-700'}`} />
          {user ? (chrome.isEn ? 'Member' : '会员') : (chrome.isEn ? 'Guest' : '游客')}
        </span>
        <span className="font-mono">
          {user
            ? `ID: ${user.email}`
            : `ID: GUEST-9384`}
        </span>
      </div>

      {/* Recent orders only — full-width quick links live in sidebar / top nav */}
      <section className="bg-white border border-ink-100 overflow-hidden">
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
          <ul className="grid grid-cols-1 md:grid-cols-3 divide-x divide-y md:divide-y-0 divide-ink-100">
            {recentOrders.map((o) => (
              <li
                key={o.id}
                className="px-4 py-3 border-b border-ink-100 last:border-b-0 md:border-b-0 hover:bg-ink-50 transition-colors cursor-pointer"
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
    </UserShell>
  );
}
