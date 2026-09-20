/**
 * page-nav — single source of truth for the shared layout chrome used on
 * cart / orders / wishlist / profile / pay-records pages.
 *
 * Before this helper existed, each sub-page re-defined NAV_ITEMS_ZH / NAV_ITEMS_EN
 * + CURRENCY_OPTIONS + LANG_OPTIONS inline. That duplicated code, drifted
 * (wishlist used active="home" instead of "wishlist"), and 3 of 4 pages had
 * `onCurrencyChange={() => {}}` so the currency dropdown was visually
 * interactive but did nothing.
 *
 * Now every sub-page calls `usePageChrome('orders')` and gets:
 *   - brand      → localized brand info from useT()
 *   - navItems   → localized nav with the right key marked active
 *   - currency   → from store + onCurrencyChange wired to setCurrency
 *   - lang       → from store + onLangChange wired to setLocale
 *   - announce   → localized announcement bar copy
 *
 * Adding a new sub-page = one new NAV_ITEMS variant + a new nav key here.
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePeakStore, type CurrencyCode, type Locale } from './store';
import { useT } from './use-t';

export const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'USD', label: 'USD 美元' },
  { code: 'CNY', label: 'CNY 人民币' },
  { code: 'EUR', label: 'EUR 欧元' },
  { code: 'GBP', label: 'GBP 英镑' },
  { code: 'JPY', label: 'JPY 日元' },
  { code: 'KRW', label: 'KRW 韩元' },
  { code: 'AUD', label: 'AUD 澳元' },
  { code: 'CAD', label: 'CAD 加元' },
];

export const LANG_OPTIONS: Array<{ code: Locale; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
];

/** Nav items for the secondary (account-area) pages. */
const SUB_NAV_ITEMS: Record<Locale, Array<{ key: string; label: string; href: string }>> = {
  zh: [
    { key: 'home', label: '首页', href: '/' },
    { key: 'cart', label: '购物车', href: '/cart' },
    { key: 'orders', label: '我的订单', href: '/orders' },
    { key: 'wishlist', label: '我的收藏', href: '/wishlist' },
    { key: 'address', label: '我的地址', href: '/address' },
    { key: 'aftersale', label: '我的售后', href: '/aftersale' },
    { key: 'commissions', label: '佣金明细', href: '/commissions' },
    { key: 'withdraw', label: '提现中心', href: '/withdraw' },
    { key: 'withdraw-address', label: '提现地址', href: '/withdraw-address' },
    { key: 'profile', label: '个人中心', href: '/profile' },
  ],
  en: [
    { key: 'home', label: 'Home', href: '/' },
    { key: 'cart', label: 'Cart', href: '/cart' },
    { key: 'orders', label: 'My orders', href: '/orders' },
    { key: 'wishlist', label: 'Wishlist', href: '/wishlist' },
    { key: 'address', label: 'Addresses', href: '/address' },
    { key: 'aftersale', label: 'After-sales', href: '/aftersale' },
    { key: 'commissions', label: 'Commissions', href: '/commissions' },
    { key: 'withdraw', label: 'Withdraw', href: '/withdraw' },
    { key: 'withdraw-address', label: 'Payout address', href: '/withdraw-address' },
    { key: 'profile', label: 'Account', href: '/profile' },
  ],
};

/**
 * Nav items for the home-area chrome (home page + login page).
 * Mirrors HOME_NAV in src/app/page.tsx — kept here so the helper stays
 * the single source of truth for chrome wiring.
 */
const HOME_NAV_ITEMS: Record<Locale, Array<{ key: string; label: string; href: string }>> = {
  zh: [
    { key: 'home', label: '首页', href: '/' },
    { key: 'all', label: '全部', href: '/shop-all' },
    { key: 'new', label: '新品', href: '/shop-new' },
    { key: 'hot', label: '热卖', href: '/shop-hot' },
    { key: 'orders', label: '我的订单', href: '/orders' },
    { key: 'after', label: '售后', href: '/aftersale' },
    { key: 'about', label: '关于', href: '/about' },
  ],
  en: [
    { key: 'home', label: 'Home', href: '/' },
    { key: 'all', label: 'All', href: '/shop-all' },
    { key: 'new', label: 'New', href: '/shop-new' },
    { key: 'hot', label: 'Hot', href: '/shop-hot' },
    { key: 'orders', label: 'My orders', href: '/orders' },
    { key: 'after', label: 'After-sales', href: '/aftersale' },
    { key: 'about', label: 'About', href: '/about' },
  ],
};

/** Per-page announcement copy (top scrolling bar). */
const ANNOUNCE: Record<Locale, { tag: string; text: string }> = {
  zh: { tag: '公告', text: '全场满 $50 包邮 · 7 天无理由退换' },
  en: { tag: 'Notice', text: 'Free shipping over $50 · 7-day no-reason returns' },
};

export type PageKey =
  | 'home'
  | 'all'
  | 'new'
  | 'hot'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'order-detail'
  | 'wishlist'
  | 'address'
  | 'aftersale'
  | 'about'
  | 'funds'
  | 'team'
  | 'commissions'
  | 'withdraw'
  | 'withdraw-address'
  | 'profile'
  | 'pay-records'
  | 'search'
  | 'terms'
  | 'privacy';

export type NavMode = 'home' | 'account';

export interface PageChrome {
  /** Localized brand {name, slogan}. */
  brand: { name: string; slogan: string };
  /** Localized nav items, ready to pass to <ShopHeader navItems>. */
  navItems: Array<{ key: string; label: string; href: string }>;
  /** 'mounted' gates locale-dependent rendering to avoid hydration mismatch. */
  mounted: boolean;
  isEn: boolean;
  active: PageKey;
  currency: CurrencyCode;
  currencyOptions: typeof CURRENCY_OPTIONS;
  onCurrencyChange: (c: CurrencyCode) => void;
  lang: Locale;
  langOptions: typeof LANG_OPTIONS;
  onLangChange: (l: Locale) => void;
  announceTag: string;
  announceText: string;
}

/**
 * usePageChrome — drop-in helper for every sub-page header.
 *
 * Reads locale + currency from the Zustand store, falls back to zh / USD on
 * the very first render before persist hydration completes (same hydration
 * pattern as useT).
 */
export function usePageChrome(active: PageKey, mode: NavMode = 'account'): PageChrome {
  const t = useT();
  // URL wins over persisted locale, matching useT()'s resolution rule.
  // pathname is read here so a first-paint en/* route returns English chrome
  // even before the Zustand store has hydrated from localStorage.
  const pathname = usePathname();
  const locale = usePeakStore((s) => s.locale);
  const setLocale = usePeakStore((s) => s.setLocale);
  const currency = usePeakStore((s) => s.currency);
  const setCurrency = usePeakStore((s) => s.setCurrency);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isEnPath = pathname === '/en' || pathname.startsWith('/en/');
  const safeLocale: Locale = mounted ? (isEnPath ? 'en' : locale) : (isEnPath ? 'en' : 'zh');
  const isEn = safeLocale === 'en';
  const navItems = mode === 'home' ? HOME_NAV_ITEMS[safeLocale] : SUB_NAV_ITEMS[safeLocale];
  const announce = ANNOUNCE[safeLocale];
  // Currency + language labels: localize the option labels at render time so
  // /en/* pages don't show the default zh short names (e.g. "CNY 人民币").
  const localizedCurrencyOptions = CURRENCY_OPTIONS.map((o) => ({
    code: o.code,
    label: t.currencyLabel[o.code] ?? o.label,
  }));
  const localizedLangOptions = LANG_OPTIONS.map((o) => ({
    code: o.code,
    label: t.langLabel[o.code] ?? o.label,
  }));

  return {
    brand: { name: t.brand.name, slogan: t.brand.slogan },
    navItems,
    mounted,
    isEn,
    active,
    currency,
    currencyOptions: localizedCurrencyOptions,
    onCurrencyChange: (c) => setCurrency(c),
    lang: locale,
    langOptions: localizedLangOptions,
    onLangChange: (l) => setLocale(l),
    announceTag: announce.tag,
    announceText: announce.text,
  };
}