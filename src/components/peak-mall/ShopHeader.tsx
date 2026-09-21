'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, type FC } from 'react';
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
import { getCurrentUser, logout } from '@/lib/auth';
import SearchSuggestions, { appendHistory } from './SearchSuggestions';

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
  /** S1: 搜索建议下拉状态 */
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    setUserEmail(getCurrentUser()?.email ?? null);
  }, []);

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

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    appendHistory(trimmed);
    if (onSearch) onSearch(trimmed);
    else router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
    setActiveIndex(-1);
  };

  const pick = (value: string) => {
    setQ(value);
    setOpen(false);
    setActiveIndex(-1);
    appendHistory(value);
    if (onSearch) onSearch(value);
    else router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  /** 键盘导航:ArrowDown/Up/Tab 在联想/历史/热门中导航 */
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    // 估算总行数 — 复用 SearchSuggestions 的状态不好逆推,走个近似:最多 5 联想 + 8 历史 + 2 热门 = 15
    const maxRows = 15;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % maxRows);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? maxRows - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
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
                <Link key={n.key} href={(n as { href?: string }).href || '#'} className="cursor-pointer hover:text-orange-500" onClick={n.onClick}>
                  {n.label}
                </Link>
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
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
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
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-[480px] relative">
          <form
            ref={formRef}
            role="search"
            onSubmit={submit}
            aria-label={t.header.searchAria}
            className="flex w-full items-center gap-2 px-3.5 h-[40px] bg-neutral-50 border border-neutral-200 rounded-full focus-within:border-orange-500 focus-within:bg-white transition-colors"
          >
            <span aria-hidden="true" className="text-[15px] text-neutral-500">🔍</span>
            <label htmlFor="peak-mall-search" className="sr-only">
              {t.header.searchAria}
            </label>
            <input
              id="peak-mall-search"
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIndex(-1); }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKey}
              placeholder={finalPlaceholder}
              aria-label={t.header.inputAria}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="peak-search-suggestions"
              autoComplete="off"
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
          {open && (
            <div id="peak-search-suggestions" className="absolute left-0 right-0 top-full">
              <SearchSuggestions
                query={q}
                activeIndex={activeIndex}
                onPick={pick}
                onClose={() => { setOpen(false); setActiveIndex(-1); }}
                inputRef={inputRef}
                formRef={formRef}
                searchAria={t.header.searchAria}
                sugHistory={t.header.sugHistory}
                sugHot={t.header.sugHot}
                sugEmpty={t.header.sugEmpty}
                sugClear={t.header.sugClear}
                sugNoHistory={t.header.sugNoHistory}
                clear={t.header.clear}
              />
            </div>
          )}
          </div>

          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label={t.nav.home}>
            {finalNavItems
              .filter((n) => !n.top)
              .map((n) => {
                const on = n.key === active;
                const href = (n as { href?: string }).href || '/';
                return (
                  <Link
                    key={n.key}
                    href={href}
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
                  </Link>
                );
              })}
          </nav>

          {/* Cart + Wish icons */}
          <div className="flex items-center gap-1 ml-auto">
            {userEmail && (
              <div className="hidden md:flex items-center gap-2 mr-1 pl-3 pr-1 h-9 rounded-full border border-neutral-200 bg-white/80 text-[12px] text-neutral-700">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="max-w-[160px] truncate" title={userEmail}>
                  {userEmail}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setUserEmail(null);
                    window.location.href = finalLang === 'en' ? '/en/login' : '/login';
                  }}
                  className="px-2 py-1 text-[11.5px] font-medium text-neutral-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  aria-label={`${t.header.logoutAria} (${userEmail})`}
                >
                  ⎋ {t.header.logout}
                </button>
              </div>
            )}
            <button
              onClick={() => router.push('/wishlist')}
              aria-label={`${t.footer.wishlist} (${wishCount})`}
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
              aria-label={`${t.cart.title} (${cartCount})`}
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
