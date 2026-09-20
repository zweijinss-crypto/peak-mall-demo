import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import type {
  BrandInfo,
  CurrencyOption,
  LangCode,
  LangOption,
  NavItem,
} from './types';
import { COPY } from '@/lib/copy';
import { usePeakStore } from '@/lib/store';

export interface ShopHeaderProps {
  brand?: BrandInfo;
  navItems?: NavItem[];
  /** 当前激活的 nav key */
  active?: string;
  currencyOptions?: CurrencyOption[];
  currency?: string;
  onCurrencyChange?: (code: string) => void;
  langOptions?: LangOption[];
  lang?: LangCode;
  onLangChange?: (code: LangCode) => void;
}

const DEFAULT_NAV: NavItem[] = [
  { key: 'home', label: '首页' },
  { key: 'all', label: '全部' },
  { key: 'new', label: '新品' },
  { key: 'hot', label: '热卖' },
  { key: 'orders', label: '我的订单' },
  { key: 'after', label: '售后' },
  { key: 'about', label: '关于' },
];

const DEFAULT_CURRENCY: CurrencyOption[] = [
  { code: 'USD', label: 'USD 美元' },
  { code: 'CNY', label: 'CNY 人民币' },
  { code: 'EUR', label: 'EUR 欧元' },
  { code: 'GBP', label: 'GBP 英镑' },
  { code: 'JPY', label: 'JPY 日元' },
  { code: 'KRW', label: 'KRW 韩元' },
  { code: 'AUD', label: 'AUD 澳元' },
  { code: 'CAD', label: 'CAD 加元' },
];

const DEFAULT_LANG: LangOption[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
];

/**
 * ShopHeader - 商城主头部 (顶栏 + logo + nav)
 */
const ShopHeader: FC<ShopHeaderProps> = ({
  brand = { name: COPY.brand.name, slogan: COPY.brand.slogan },
  navItems = DEFAULT_NAV,
  active,
  currencyOptions = DEFAULT_CURRENCY,
  currency,
  onCurrencyChange,
  langOptions = DEFAULT_LANG,
  lang,
  onLangChange,
}) => {
  const router = useRouter();
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  return (
    <>
      {/* 顶部细条 */}
      <div className="bg-neutral-50 border-b border-neutral-200 h-8 flex items-center text-[12.5px] text-neutral-600">
        <div className="max-w-[1280px] mx-auto px-5 w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-neutral-700">您好,欢迎来到顶峰</span>
            <span className="w-px h-3 bg-neutral-300" />
            <Link href="/login" className="cursor-pointer hover:text-orange-500">登录 / 注册</Link>
          </div>
          <div className="flex items-center gap-4">
            {navItems
              .filter((n) => n.top)
              .map((n) => (
                <a key={n.key} className="cursor-pointer hover:text-orange-500" onClick={n.onClick}>
                  {n.label}
                </a>
              ))}
            {currencyOptions.length > 0 && (
              <select
                value={currency}
                onChange={(e) => onCurrencyChange?.(e.target.value)}
                className="px-2 py-0.5 border border-neutral-300 rounded text-[12px] bg-white"
                aria-label="Currency"
              >
                {currencyOptions.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            )}
            {langOptions.length > 0 && (
              <div className="inline-flex border border-neutral-200 rounded-lg overflow-hidden bg-white/60">
                {langOptions.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => onLangChange?.(l.code as LangCode)}
                    className={`px-3.5 py-1 text-[12px] font-medium transition-colors ${
                      l.code === lang
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

      {/* 主头部 */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-5 h-[68px] md:h-[76px] flex items-center gap-6">
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
            <div className="w-10 h-10 md:w-[42px] md:h-[42px] rounded-[11px] bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center text-[17px] font-extrabold tracking-wide shadow-[0_6px_16px_rgba(253,86,15,0.3)]">
              {brand.name.slice(0, 2)}
            </div>
            <div>
              <b className="block text-[16px] md:text-[17px] font-extrabold tracking-wide leading-tight">
                {brand.name}
              </b>
              <span className="block text-[10px] md:text-[10.5px] text-neutral-700 tracking-[1.6px] uppercase">
                {brand.slogan}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-px flex-1">
            {navItems
              .filter((n) => !n.top)
              .map((n) => {
                const on = n.key === active;
                return (
                  <a
                    key={n.key}
                    onClick={n.onClick}
                    className={`relative px-3.5 py-2 text-[14.5px] font-medium rounded-md cursor-pointer whitespace-nowrap ${
                      on ? 'text-orange-700' : 'text-neutral-900 hover:text-orange-600'
                    }`}
                  >
                    {n.label}
                    {on && (
                      <span className="absolute left-3.5 right-3.5 bottom-0.5 h-0.5 bg-orange-700 rounded-sm" />
                    )}
                  </a>
                );
              })}
          </nav>

          {/* Cart + Wish icons */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => router.push('/wishlist')}
              aria-label={`${COPY.footer.wishlist} (${wishCount})`}
              className="relative w-10 h-10 flex items-center justify-center rounded-md text-[18px] text-neutral-700 hover:bg-neutral-100 hover:text-orange-500 transition-colors"
            >
              ♡
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
