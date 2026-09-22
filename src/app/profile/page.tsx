'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  UserShell,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { getCurrentUser, logout, type AuthUser } from '@/lib/auth';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

/**
 * Profile — visual + UX refresh.
 *
 * Changes vs previous version:
 *   - Banner replaced by a custom two-column hero (avatar block + stats).
 *     The shared PageBanner is too rigid for the dual logged-in / guest layout
 *     and forces 4 stats even when there's nothing to count.
 *   - Guest state collapses to 2 stats + a clear sign-in CTA block; logged-in
 *     state shows 4 stats (orders / wallet / this month / member since).
 *   - Added a "Quick actions" grid with the 5 sidebar items that aren't
 *     visible from the banner: addresses, wishlist, aftersale, change
 *     password, fund password. Each card is a real <Link> so middle-click
 *     and right-click work.
 *   - Recent orders: status chip uses status-aware colors (delivered =
 *     emerald, shipped = blue, processing = amber, default = ink). Row
 *     navigates to /orders/[id] instead of /orders.
 *   - Empty state: dropped the 📭 emoji (felt out of place on a finance-y
 *     dashboard); kept the same copy, made the CTA a real <Link>.
 *   - Nickname derives initials for the avatar block — no real avatar API
 *     in this demo, just colored initials on a tinted square.
 */
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

  const displayName =
    user?.nickname ||
    user?.email?.split('@')[0] ||
    (chrome.isEn ? 'Guest' : '游客');
  const memberSince = user
    ? new Date(user.loggedInAt).toLocaleDateString(
        chrome.isEn ? 'en-CA' : 'zh-CN',
        { year: 'numeric', month: '2-digit', day: '2-digit' },
      )
    : '—';
  const initials = displayName.slice(0, 1).toUpperCase();

  // 5 quick actions — covers sidebar entries not surfaced in the banner.
  // Routes use the real security/password + security/fund-password sub-routes
  // (sidebar links here, /addresses is the plural alias used in the sidebar).
  const quickActions = chrome.isEn
    ? [
        { href: '/en/wishlist', label: 'Wishlist', emoji: '⭐' },
        { href: '/en/addresses', label: 'Addresses', emoji: '📍' },
        { href: '/en/aftersale', label: 'After-sale', emoji: '🛠️' },
        { href: '/en/security/password', label: 'Change password', emoji: '🔑' },
        { href: '/en/security/fund-password', label: 'Fund password', emoji: '🔐' },
      ]
    : [
        { href: '/wishlist', label: '我的收藏', emoji: '⭐' },
        { href: '/addresses', label: '我的地址', emoji: '📍' },
        { href: '/aftersale', label: '我的售后', emoji: '🛠️' },
        { href: '/security/password', label: '修改密码', emoji: '🔑' },
        { href: '/security/fund-password', label: '资金密码', emoji: '🔐' },
      ];

  // Status chip color — keep colors accessible against white bg.
  const statusChip = (s: string) => {
    const k = s.toLowerCase();
    if (k === 'delivered') return 'bg-emerald-700/10 text-emerald-700';
    if (k === 'shipped') return 'bg-blue-700/10 text-blue-700';
    if (k === 'processing') return 'bg-amber-700/10 text-amber-700';
    if (k === 'paid') return 'bg-violet-700/10 text-violet-700';
    if (k === 'cancelled' || k === 'refunded') return 'bg-ink-200 text-ink-500';
    return 'bg-ink-200 text-ink-700';
  };

  return (
    <UserShell>
      {/* Hero card — avatar block + identity + stats strip + auth actions */}
      <section className="relative bg-white border border-ink-100 overflow-hidden mb-5">
        <div className="h-1.5 bg-orange-700" aria-hidden="true" />
        <div className="px-5 py-5 md:px-6 md:py-6 flex items-center gap-5">
          {/* Avatar block — initials on tinted square. Sized to look like
              a real avatar but stays text-only for the demo. */}
          <div
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-[20px] md:text-[22px] font-bold flex-shrink-0 rounded ${
              user
                ? 'bg-orange-700 text-white'
                : 'bg-ink-100 text-ink-500'
            }`}
            aria-hidden="true"
          >
            {user ? initials : '·'}
          </div>

          {/* Identity + stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] md:text-[22px] font-bold text-ink-900 leading-tight">
                {displayName}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                  user
                    ? 'bg-emerald-700/10 text-emerald-700'
                    : 'bg-teal-700/10 text-teal-700'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${
                    user ? 'bg-emerald-700' : 'bg-teal-700'
                  }`}
                />
                {user
                  ? chrome.isEn
                    ? 'Member'
                    : '会员'
                  : chrome.isEn
                  ? 'Guest'
                  : '游客'}
              </span>
            </div>
            <div className="mt-0.5 text-[12px] text-ink-500 truncate">
              {user
                ? chrome.isEn
                  ? 'Account overview'
                  : '账户总览'
                : chrome.isEn
                ? 'Sign in to access all features'
                : '登录后使用全部功能'}
            </div>

            {/* Stats strip — only shown when meaningful */}
            <div className="mt-3 flex divide-x divide-ink-100 border border-ink-100 inline-flex">
              {user ? (
                <>
                  <div className="px-4 py-1.5 text-center min-w-[72px]">
                    <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500">
                      {chrome.isEn ? 'Orders' : '订单数'}
                    </div>
                    <div className="text-[16px] font-bold text-ink-900 tabular-nums">
                      {orderCount}
                    </div>
                  </div>
                  <div className="px-4 py-1.5 text-center min-w-[88px]">
                    <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500">
                      {chrome.isEn ? 'Wallet' : '钱包余额'}
                    </div>
                    <div className="text-[16px] font-bold text-orange-700 tabular-nums">
                      {walletBalance}
                    </div>
                  </div>
                  <div className="px-4 py-1.5 text-center min-w-[88px]">
                    <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500">
                      {chrome.isEn ? 'This month' : '本月佣金'}
                    </div>
                    <div className="text-[16px] font-bold text-ink-900 tabular-nums">
                      {thisMonthCommission}
                    </div>
                  </div>
                  <div className="px-4 py-1.5 text-center min-w-[96px]">
                    <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500">
                      {chrome.isEn ? 'Member since' : '注册时间'}
                    </div>
                    <div className="text-[12px] font-bold text-ink-900 tabular-nums">
                      {memberSince}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 py-1.5 text-center min-w-[72px]">
                    <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500">
                      {chrome.isEn ? 'Orders' : '订单数'}
                    </div>
                    <div className="text-[16px] font-bold text-ink-900 tabular-nums">
                      {orderCount}
                    </div>
                  </div>
                  <div className="px-4 py-1.5 text-center min-w-[88px]">
                    <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500">
                      {chrome.isEn ? 'Member tier' : '会员等级'}
                    </div>
                    <div className="text-[12px] font-bold text-ink-500">
                      {chrome.isEn ? '—' : '—'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Auth actions — sign out OR sign in / register */}
          <div className="flex-shrink-0">
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setUser(null);
                  router.refresh();
                }}
                className="px-4 py-2 bg-white border border-ink-200 text-ink-700 text-[12px] font-bold hover:bg-ink-50 transition-colors"
              >
                {chrome.isEn ? 'Sign out' : '退出登录'}
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  href={chrome.isEn ? '/en/login' : '/login'}
                  className="px-4 py-2 bg-orange-700 text-white text-[12px] font-bold hover:bg-orange-800 transition-colors inline-block"
                >
                  {chrome.isEn ? 'Sign in' : t.profile.goLogin}
                </Link>
                <Link
                  href={chrome.isEn ? '/en/register' : '/register'}
                  className="px-4 py-2 bg-white text-ink-900 border border-ink-900 text-[12px] font-bold hover:bg-ink-900 hover:text-white transition-colors inline-block"
                >
                  {chrome.isEn ? 'Create account' : '注册账户'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Member meta line — single tier/ID strip */}
        <div className="px-5 md:px-6 pb-3 -mt-1 flex items-center gap-2 text-[11px] text-ink-500">
          <span className="font-mono">
            {user
              ? `ID: ${user.email}`
              : `ID: GUEST-9384`}
          </span>
        </div>
      </section>

      {/* Quick actions — 5 cards across, hide while guest (they all need login) */}
      {user && (
        <section className="mb-5">
          <h2 className="text-[12px] font-bold text-ink-900 mb-2 px-1">
            {chrome.isEn ? 'Quick actions' : '快捷入口'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="bg-white border border-ink-100 px-3 py-2.5 flex items-center gap-2 hover:border-orange-700 hover:bg-orange-700/[0.03] transition-colors group"
              >
                <span className="text-[16px]" aria-hidden="true">{a.emoji}</span>
                <span className="text-[12px] font-semibold text-ink-700 group-hover:text-ink-900 truncate">
                  {a.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent orders */}
      <section className="bg-white border border-ink-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-ink-100 flex items-center justify-between">
          <h2 className="text-[12px] font-bold text-ink-900">
            {chrome.isEn ? 'Recent orders' : '最近订单'}
          </h2>
          <Link
            href={chrome.isEn ? '/en/orders' : '/orders'}
            className="text-[11px] text-orange-700 font-semibold hover:text-orange-800"
          >
            {chrome.isEn ? 'See all' : '查看全部'} →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-[12px] text-ink-700 font-semibold mb-3">
              {chrome.isEn ? 'No orders yet' : '还没有订单'}
            </div>
            <Link
              href={chrome.isEn ? '/en' : '/'}
              className="text-[11px] font-bold text-orange-700 hover:text-orange-800 inline-block"
            >
              {chrome.isEn ? 'Start shopping →' : '去逛逛 →'}
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-3 divide-x divide-y md:divide-y-0 divide-ink-100">
            {recentOrders.map((o) => (
              <li
                key={o.id}
                className="border-b border-ink-100 last:border-b-0 md:border-b-0"
              >
                <Link
                  href={`/orders/${o.id}`}
                  className="block px-4 py-3 hover:bg-ink-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-ink-500">
                      #{o.id}
                    </span>
                    <span className="text-[11px] text-ink-500">
                      {new Date(o.createdAt).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <div className="text-[12.5px] font-semibold text-ink-900 truncate mb-1.5">
                    {o.items?.[0]?.name ?? '—'}
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded ${statusChip(o.status)}`}
                    >
                      {o.status}
                    </span>
                    <span className="text-[12.5px] font-bold text-ink-900 tabular-nums">
                      ${o.total?.toFixed?.(2) ?? '0.00'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </UserShell>
  );
}
