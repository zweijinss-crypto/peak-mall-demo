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
const SUB_NAV_ITEMS: Record<Locale, Array<{ key: string; label: string }>> = {
  zh: [
    { key: 'home', label: '首页' },
    { key: 'cart', label: '购物车' },
    { key: 'orders', label: '我的订单' },
    { key: 'wishlist', label: '我的收藏' },
    { key: 'address', label: '我的地址' },
    { key: 'aftersale', label: '我的售后' },
    { key: 'commissions', label: '佣金明细' },
    { key: 'withdraw', label: '提现中心' },
    { key: 'withdraw-address', label: '提现地址' },
    { key: 'profile', label: '个人中心' },
  ],
  en: [
    { key: 'home', label: 'Home' },
    { key: 'cart', label: 'Cart' },
    { key: 'orders', label: 'My orders' },
    { key: 'wishlist', label: 'Wishlist' },
    { key: 'address', label: 'Addresses' },
    { key: 'aftersale', label: 'After-sales' },
    { key: 'commissions', label: 'Commissions' },
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'withdraw-address', label: 'Payout address' },
    { key: 'profile', label: 'Account' },
  ],
};

/**
 * Nav items for the home-area chrome (home page + login page).
 * Mirrors HOME_NAV in src/app/page.tsx — kept here so the helper stays
 * the single source of truth for chrome wiring.
 */
const HOME_NAV_ITEMS: Record<Locale, Array<{ key: string; label: string }>> = {
  zh: [
    { key: 'home', label: '首页' },
    { key: 'all', label: '全部' },
    { key: 'new', label: '新品' },
    { key: 'hot', label: '热卖' },
    { key: 'orders', label: '我的订单' },
    { key: 'after', label: '售后' },
    { key: 'about', label: '关于' },
  ],
  en: [
    { key: 'home', label: 'Home' },
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'hot', label: 'Hot' },
    { key: 'orders', label: 'My orders' },
    { key: 'after', label: 'After-sales' },
    { key: 'about', label: 'About' },
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
  | 'wishlist'
  | 'address'
  | 'aftersale'
  | 'commissions'
  | 'withdraw'
  | 'withdraw-address'
  | 'profile'
  | 'pay-records'
  | 'search';

export type NavMode = 'home' | 'account';

export interface PageChrome {
  /** Localized brand {name, slogan}. */
  brand: { name: string; slogan: string };
  /** Localized nav items, ready to pass to <ShopHeader navItems>. */
  navItems: Array<{ key: string; label: string }>;
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
  const locale = usePeakStore((s) => s.locale);
  const setLocale = usePeakStore((s) => s.setLocale);
  const currency = usePeakStore((s) => s.currency);
  const setCurrency = usePeakStore((s) => s.setCurrency);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeLocale: Locale = mounted ? locale : 'zh';
  const isEn = safeLocale === 'en';
  const navItems = mode === 'home' ? HOME_NAV_ITEMS[safeLocale] : SUB_NAV_ITEMS[safeLocale];
  const announce = ANNOUNCE[safeLocale];

  return {
    brand: { name: t.brand.name, slogan: t.brand.slogan },
    navItems,
    mounted,
    isEn,
    active,
    currency,
    currencyOptions: CURRENCY_OPTIONS,
    onCurrencyChange: (c) => setCurrency(c),
    lang: locale,
    langOptions: LANG_OPTIONS,
    onLangChange: (l) => setLocale(l),
    announceTag: announce.tag,
    announceText: announce.text,
  };
}