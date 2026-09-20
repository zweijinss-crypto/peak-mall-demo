'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  UserShell,
  PageBanner,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('profile');
  const orderCount = usePeakStore((s) => s.orders.length);
  const orders = usePeakStore((s) => s.orders);
  const recentOrders = useMemo(() => orders.slice(-3).reverse(), [orders]);

  return (
    <UserShell>
      {/* Member card — identity + dashboard stats */}
      <PageBanner
        title={chrome.isEn ? 'Guest user' : '访客用户'}
        subtitle={chrome.isEn ? 'Sign in to access all features' : '登录后使用全部功能'}
        stats={[
          { label: chrome.isEn ? 'Orders' : '订单数', value: orderCount },
          { label: chrome.isEn ? 'Wallet' : '钱包余额', value: '$0.00', tone: 'accent' as const },
          { label: chrome.isEn ? 'This month' : '本月佣金', value: '$0.00' },
          { label: chrome.isEn ? 'Team' : '团队人数', value: 0 },
        ]}
        trailing={
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
        }
      />

      {/* Member meta — single tier line, skip when nothing meaningful to say */}
      <div className="flex items-center gap-2 mb-5 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-700/10 text-teal-700 font-semibold uppercase tracking-wider rounded">
          <span className="w-1 h-1 rounded-full bg-teal-700" />
          {chrome.isEn ? 'Guest' : '游客'}
        </span>
        <span className="font-mono">ID: GUEST-9384</span>
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
