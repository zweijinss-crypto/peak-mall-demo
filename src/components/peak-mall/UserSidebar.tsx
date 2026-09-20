'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/use-t';
import { getCurrentUser, logout } from '@/lib/auth';
import { useEffect, useState } from 'react';

/**
 * UserSidebar — logged-in user left rail for personal-center routes.
 *
 * Mirrors the source site's 4-group nav:
 *   商城 (Mall)        — 商城首页 / 全部 / 最新 / 热卖 / 购物车 / 订单
 *   分销业务 (Business) — 我的账户 / 佣金 / 提现 / 提现地址
 *   账户 (Account)      — 个人中心 / 修改密码 / 资金密码
 *   我的 (Mine)         — 我的地址 / 我的收藏 / 我的售后
 *
 * Pure presentational — receives no children. The host page composes
 * UserShell which adds the right-side main area.
 */
export interface UserSidebarProps {
  /** Force a locale when rendering. Defaults to URL detection. */
  isEn?: boolean;
}

export function UserSidebar({ isEn: isEnProp }: UserSidebarProps = {}) {
  const t = useT();
  const pathname = usePathname() ?? '';
  const isEn =
    isEnProp ?? (pathname.startsWith('/en/') || pathname === '/en');
  const localePrefix = isEn ? '/en' : '';

  const [email, setEmail] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setEmail(u?.email ?? null);
    setNickname(u?.nickname ?? null);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = isEn ? '/en/login' : '/login';
  };

  const groups: { labelKey: string; items: { href: string; labelKey: string; emoji: string }[] }[] = [
    {
      labelKey: 'groupMall',
      items: [
        { href: `${localePrefix}/`, labelKey: 'navShopHome', emoji: '🛍️' },
        { href: `${localePrefix}/shop-all`, labelKey: 'navShopAll', emoji: '🗂️' },
        { href: `${localePrefix}/shop-new`, labelKey: 'navShopNew', emoji: '✨' },
        { href: `${localePrefix}/shop-hot`, labelKey: 'navShopHot', emoji: '🔥' },
        { href: `${localePrefix}/cart`, labelKey: 'navCart', emoji: '🛒' },
        { href: `${localePrefix}/orders`, labelKey: 'navMyOrders', emoji: '📦' },
      ],
    },
    {
      labelKey: 'groupDistribute',
      items: [
        { href: `${localePrefix}/profile`, labelKey: 'navMyAccount', emoji: '🏠' },
        { href: `${localePrefix}/commissions`, labelKey: 'navCommissions', emoji: '📈' },
        { href: `${localePrefix}/withdraw`, labelKey: 'navWithdraw', emoji: '💳' },
        { href: `${localePrefix}/withdraw-address`, labelKey: 'navWithdrawAddr', emoji: '🏦' },
      ],
    },
    {
      labelKey: 'groupAccount',
      items: [
        { href: `${localePrefix}/profile`, labelKey: 'navPersonalCenter', emoji: '👤' },
        { href: `${localePrefix}/security/password`, labelKey: 'navChangePassword', emoji: '🔑' },
        { href: `${localePrefix}/security/fund-password`, labelKey: 'navFundPassword', emoji: '🔐' },
      ],
    },
    {
      labelKey: 'groupMine',
      items: [
        { href: `${localePrefix}/address`, labelKey: 'navMyAddress', emoji: '📍' },
        { href: `${localePrefix}/wishlist`, labelKey: 'navMyWishlist', emoji: '⭐' },
        { href: `${localePrefix}/aftersale`, labelKey: 'navMyAftersale', emoji: '🛠️' },
      ],
    },
  ];

  return (
    <aside className="w-full md:w-[236px] md:flex-shrink-0 bg-white border border-neutral-200 rounded-xl md:min-h-[calc(100vh-200px)] py-2 md:py-3">
      <div className="px-[18px] py-3 border-b border-neutral-100">
        <div className="text-[14px] font-bold text-neutral-900 leading-tight">
          {nickname || email || (isEn ? 'Account' : '账户')}
        </div>
        {email && (
          <small className="block text-[11px] text-neutral-500 mt-0.5 break-all">({email})</small>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 text-[11.5px] text-neutral-600 hover:text-red-700 underline"
        >
          {t.userSidebar.logout}
        </button>
      </div>

      <nav className="py-1">
        {groups.map((g, gi) => (
          <div key={gi} className="mb-1">
            <div className="px-[18px] py-1.5 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
              {t.userSidebar[g.labelKey]}
            </div>
            {g.items.map((item) => {
              // Use startsWith so /orders/[id] still marks /orders active
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href + '/')) ||
                (item.href === '/' && pathname === '/');
              return (
                <Link
                  key={item.href + item.labelKey}
                  href={item.href}
                  className={`flex items-center gap-2 px-[18px] py-[8px] text-[13.5px] transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  <span>{t.userSidebar[item.labelKey]}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}