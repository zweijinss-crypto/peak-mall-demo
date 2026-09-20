'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, type FC } from 'react';
import type {
  BrandInfo,
  CurrencyCode,
  CurrencyOption,
  LangCode,
  LangOption,
  NavItem,
} from './types';
import { COPY } from '@/lib/copy';
import { useT } from '@/lib/use-t';
import { usePeakStore } from '@/lib/store';

export interface ShopHeaderProps {
  brand?: BrandInfo;
  navItems?: NavItem[];
  /** Current active nav key. */
  active?: string;
  currencyOptions?: CurrencyOption[];
  currency?: CurrencyCode;
  onCurrencyChange?: (code: CurrencyCode) => void;
  langOptions?: LangOption[];
  lang?: LangCode;
  onLangChange?: (code: LangCode) => void;
  /** Search input placeholder (locale-aware). */
  searchPlaceholder?: string;
  /** Search submit handler. Defaults to router.push('/search?q=...'). */
  onSearch?: (query: string) => void;
  /** Initial search value (e.g. pre-fill on /search?q=foo). */
  initialQuery?: string;
}

const CURRENCY_CODES: CurrencyCode[] = ['USD', 'CNY', 'EUR', 'GBP', 'JPY', 'KRW', 'AUD', 'CAD'];
const LANG_CODES: LangCode[] = ['zh', 'en'];

const ShopHeader: FC<ShopHeaderProps> = ({
  brand,
  navItems,
  active,
  currencyOptions,
  currency,
  onCurrencyChange,
  langOptions,
  lang,
  onLangChange,
  searchPlaceholder,
  onSearch,
  initialQuery = '',
}) => {
  const t = useT();
  const router = useRouter();
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  const [q, setQ] = useState(initialQuery);
  useEffect(() => setQ(initialQuery), [initialQuery]);

  const finalBrand: BrandInfo = brand ?? { name: t.brand.name, slogan: t.brand.slogan };

  const finalNavItems: NavItem[] = navItems ?? [
    { key: 'home', label: t.nav.home },
    { key: 'all', label: t.nav.all },
    { key: 'new', label: t.nav.new },
    { key: 'hot', label: t.nav.hot },
    { key: 'orders', label: t.nav.orders },
    { key: 'after', label: t.nav.after },
    { key: 'about', label: t.nav.about },
  ];

  const finalCurrencyOptions: CurrencyOption[] =
    currencyOptions ?? CURRENCY_CODES.map((code) => ({
      code,
      label: t.currencyLabel[code] ?? `${code}`,
    }));

  const finalLangOptions: LangOption[] =
    langOptions ?? LANG_CODES.map((code) => ({
      code,
      label: t.langLabel[code] ?? code.toUpperCase(),
    }));

  const finalPlaceholder = searchPlaceholder ?? t.hero.searchPlaceholder;
  const finalLang = lang ?? 'zh';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    if (onSearch) onSearch(trimmed);
    else router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      {/* Top thin bar */}
      <div className="bg-neutral-50 border-b border-neutral-200 h-8 flex items-center text-[12.5px] text-neutral-600">
        <div className="max-w-[1280px] mx-auto px-5 w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-neutral-700">{t.header.welcome}</span>
            <span className="w-px h-3 bg-neutral-300" />
            <Link href="/login" className="cursor-pointer hover:text-orange-500">{t.header.login}</Link>
          </div>
          <div className="flex items-center gap-4">
            {finalNavItems
              .filter((n) => n.top)
              .map((n) => (
                <a key={n.key} className="cursor-pointer hover:text-orange-500" onClick={n.onClick}>
                  {n.label}
                </a>
              ))}
            {finalCurrencyOptions.length > 0 && (
              <select
                value={currency}
                onChange={(e) => onCurrencyChange?.(e.target.value as CurrencyCode)}
                className="px-2 py-0.5 border border-neutral-300 rounded text-[12px] bg-white"
                aria-label="Currency"
              >
                {finalCurrencyOptions.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            )}
            {finalLangOptions.length > 0 && (
              <div className="inline-flex border border-neutral-200 rounded-lg overflow-hidden bg-white/60">
                {finalLangOptions.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => onLangChange?.(l.code as LangCode)}
                    className={`px-3.5 py-1 text-[12px] font-medium transition-colors ${
                      l.code === finalLang
                        ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]'
                        : 'bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-orange-600'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-5 h-[68px] md:h-[76px] flex items-center gap-6">
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
            <div className="w-10 h-10 md:w-[42px] md:h-[42px] rounded-[11px] bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center text-[17px] font-extrabold tracking-wide shadow-[0_6px_16px_rgba(253,86,15,0.3)]">
              {finalBrand.name.slice(0, 2)}
            </div>
            <div>
              <b className="block text-[16px] md:text-[17px] font-extrabold tracking-wide leading-tight">
                {finalBrand.name}
              </b>
              <span className="block text-[10px] md:text-[10.5px] text-neutral-700 tracking-[1.6px] uppercase">
                {finalBrand.slogan}
              </span>
            </div>
          </div>

          {/* Search */}
          <form
            role="search"
            onSubmit={submit}
            aria-label={t.header.searchAria}
            className="hidden md:flex flex-1 max-w-[480px] items-center gap-2 px-3.5 h-[40px] bg-neutral-50 border border-neutral-200 rounded-full focus-within:border-orange-500 focus-within:bg-white transition-colors"
          >
            <span aria-hidden="true" className="text-[15px] text-neutral-500">🔍</span>
            <label htmlFor="peak-mall-search" className="sr-only">
              {t.header.searchAria}
            </label>
            <input
              id="peak-mall-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={finalPlaceholder}
              aria-label={t.header.inputAria}
              className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-[12px] font-bold text-white bg-orange-700 hover:bg-orange-800 rounded-full transition-colors"
              aria-label={t.header.searchAria}
            >
              {t.header.submit}
            </button>
          </form>

          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label={t.nav.home}>
            {finalNavItems
              .filter((n) => !n.top)
              .map((n) => {
                const on = n.key === active;
                return (
                  <a
                    key={n.key}
                    onClick={n.onClick}
                    className={`relative px-4 py-2 text-[14.5px] font-medium rounded-lg cursor-pointer whitespace-nowrap transition-all duration-200 ${
                      on
                        ? 'text-orange-700 bg-orange-50/70'
                        : 'text-neutral-700 hover:text-orange-700 hover:bg-orange-50/40'
                    }`}
                  >
                    {n.label}
                    {on && (
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full bg-orange-600" aria-hidden />
                    )}
                  </a>
                );
              })}
          </nav>

          {/* Cart + Wish icons */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => router.push('/wishlist')}
              aria-label={`${COPY.footer.wishlist} (${wishCount})`}
              className="relative w-10 h-10 flex items-center justify-center rounded-md text-[18px] text-neutral-700 hover:bg-neutral-100 hover:text-orange-500 transition-colors"
            >
              {t.card.wishlistOff}
              {wishCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push('/cart')}
              aria-label={`${COPY.cart.title} (${cartCount})`}
              className="relative w-10 h-10 flex items-center justify-center rounded-md text-[18px] text-neutral-700 hover:bg-neutral-100 hover:text-orange-500 transition-colors"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-orange-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default ShopHeader;
