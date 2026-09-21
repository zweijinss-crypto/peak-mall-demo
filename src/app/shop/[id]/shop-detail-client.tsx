'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  ProductCard,
  ServiceStrip,
  type Product,
} from '@/components/peak-mall';
import { useCategoryLabel } from '@/lib/use-category-label';
import { PRODUCTS } from '@/data/products';
import { usePeakStore, type CurrencyCode } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', AUD: 'A$', CAD: 'C$',
};

type Review = {
  name: string;
  role: string;
  stars: number;
  date: string;
  title: string;
  body: string;
  helpful: number;
  withPic?: boolean;
  verified?: boolean;
};

const FAKE_REVIEWS: Review[] = [
  {
    name: '陈先生',
    role: '北京 · 数码爱好者',
    stars: 5,
    date: '2026-09-12',
    title: '出乎意料的好',
    body: '本来抱着试试看的心态,结果很满意。做工扎实,手感不错,客服回复也快。出差背了三天,重量是真的轻,屏幕色准也赞。',
    helpful: 42,
    withPic: true,
    verified: true,
  },
  {
    name: 'Liu W.',
    role: 'Shanghai · Designer',
    stars: 5,
    date: '2026-08-29',
    title: 'Great value for money',
    body: 'Shipping took 4 days from the overseas warehouse. Packaging was solid — the laptop itself is gorgeous, almost a MacBook competitor at half the price. Keyboard travel is shallow but typing is satisfying.',
    helpful: 31,
    verified: true,
  },
  {
    name: '王女士',
    role: '深圳 · 居家办公',
    stars: 4,
    date: '2026-08-15',
    title: '性价比高',
    body: '整体满意,比专柜便宜不少。扣一星是因为说明书不太全,新手可能需要摸索一下。客服给了一个新手指南视频链接,瞬间解决了。',
    helpful: 18,
    verified: true,
  },
  {
    name: 'Marcus L.',
    role: 'Berlin · Software Engineer',
    stars: 5,
    date: '2026-08-02',
    title: 'Perfect for remote work',
    body: 'Runs VS Code, Docker, and two IDEs side by side without breaking a sweat. 18-hour battery means I leave the charger at home. Build quality feels premium.',
    helpful: 27,
    withPic: true,
  },
  {
    name: '周小姐',
    role: '广州 · 研究生',
    stars: 4,
    date: '2026-07-21',
    title: '适合学生',
    body: '价格对预算友好,跑 R 跟 Python 都顺。内存 16GB 够用,后面想升级 SSD 也很方便。',
    helpful: 9,
  },
];

export default function ShopDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('home', 'home');
  const productId = Number(id);
  const product: Product | undefined = PRODUCTS.find((p) => p.id === productId);
  const categoryLabel = useCategoryLabel(product?.category ?? '');

  // Hooks must run unconditionally — call them all before any early-return.
  const currency = chrome.currency;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState<number>(0);
  // v30: 图集体验 — hover zoom + lightbox + 键盘 + 自动轮播
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  // v30: SKU 颜色 / 容量 选项 + 服务保障详情 toggle
  const [variantColor, setVariantColor] = useState<'gray' | 'silver'>('gray');
  const [variantSize, setVariantSize] = useState<'512GB' | '1TB'>('512GB');
  const [expandedGuarantee, setExpandedGuarantee] = useState<string | null>(null);
  // v30: 限时倒计时 — 由创建时间动态计算(伪促销)
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number; ended: boolean }>({
    h: 23, m: 59, s: 59, ended: false,
  });
  useEffect(() => {
    // 每秒递减,到 0 重置为 24h (demo 循环)
    const id = setInterval(() => {
      setCountdown((c) => {
        let { h, m, s } = c;
        if (s > 0) s--;
        else if (m > 0) { m--; s = 59; }
        else if (h > 0) { h--; m = 59; s = 59; }
        else return { h: 23, m: 59, s: 59, ended: false };
        return { h, m, s, ended: false };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const addToCart = usePeakStore((s) => s.addToCart);
  const toggleWish = usePeakStore((s) => s.toggleWish);
  const isWished = usePeakStore((s) => s.wishlist.some((w) => w.id === productId));

  // Gallery: current + 3 related (or filler products) — stable when product changes.
  const gallery = useMemo(() => {
    if (!product) return [] as Product[];
    const sameCat = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
    const fillers = PRODUCTS.filter((p) => p.id !== product.id && !sameCat.includes(p)).slice(0, 3 - sameCat.length);
    return ([product, ...sameCat, ...fillers] as Product[]).slice(0, 4);
  }, [product]);

  // v30: 自动轮播 — gallery 长度 > 1 且未 hover 时每 4s 切
  useEffect(() => {
    if (!autoplay || gallery.length < 2) return;
    const id = setInterval(() => {
      setActiveImg((i) => (i + 1) % gallery.length);
    }, 4000);
    return () => clearInterval(id);
  }, [autoplay, gallery.length, activeImg]); // activeImg is read inside; reset timer when it changes

  // v30: 全局键盘 ←/→ 切图(不与 lightbox 冲突)
  useEffect(() => {
    if (lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowLeft') {
        setActiveImg((i) => (i - 1 + gallery.length) % gallery.length);
        setAutoplay(false);
      } else if (e.key === 'ArrowRight') {
        setActiveImg((i) => (i + 1) % gallery.length);
        setAutoplay(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, gallery.length]);

  const onAdd = () => {
    if (!product) return;
    addToCart({ id: product.id, name: product.name, price: Number(product.price), cover: product.cover }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  if (!product) {
    return (
      <>
        <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
        <ShopHeader
          brand={chrome.brand}
          navItems={chrome.navItems}
          active="home"
          currencyOptions={chrome.currencyOptions}
          currency={chrome.currency}
          onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
          langOptions={chrome.langOptions}
          lang={chrome.lang}
          onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
        />
        <main className="max-w-shell mx-auto px-5 py-24 text-center">
          <h1 className="text-[28px] font-bold text-ink-900 mb-3">
            {t.shop.notFoundTitle}
          </h1>
          <p className="text-ink-500 mb-8">{t.shop.notFoundDesc}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-ink-900 hover:bg-orange-700 text-white text-[14px] font-bold rounded transition-colors"
          >
            {t.cta.backToHome}
          </button>
        </main>
        <Footer />
      </>
    );
  }

  const sym = SYMBOLS[currency] || '$';
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const activeImage = gallery[activeImg] ?? product;
  const sold = Math.max(120, Math.floor(Number(product.stock) * 1.8));
  const dateStr = product.created_at ? new Date(product.created_at).toISOString().slice(0, 10) : '—';
  // 3 fake feature bullets derived from category
  const features = product.category === '数码电子'
    ? ['官方正品 · 一年质保', '48 小时内从海外仓直发', '支持 28 国本地售后']
    : ['官方正品 · 一年质保', '顺丰大件直送 · 上门安装', '7 天无理由退换'];

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active="all"
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        {/* Breadcrumb */}
        <nav
          aria-label={chrome.isEn ? 'Breadcrumb' : '面包屑'}
          className="text-[12.5px] text-ink-500 mb-6 flex items-center flex-wrap gap-x-1.5 gap-y-1"
        >
          <Link href="/" className="hover:text-orange-700 transition-colors">
            {chrome.isEn ? 'Home' : '首页'}
          </Link>
          <span aria-hidden="true" className="text-ink-300">/</span>
          <Link
            href={`/shop-all?cat=${encodeURIComponent(product.category)}`}
            className="hover:text-orange-700 transition-colors"
          >
            {categoryLabel}
          </Link>
          <span aria-hidden="true" className="text-ink-300">/</span>
          <span className="text-ink-700 font-semibold truncate max-w-[280px]" aria-current="page">
            {product.name}
          </span>
        </nav>

        {/* Hero: image (7) + info (5), sticky info column */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
          {/* Left — gallery */}
          <div className="md:col-span-7">
            <div className="grid grid-cols-[88px_1fr] gap-3">
              {/* Vertical thumbnail rail */}
              <div className="flex md:flex-col gap-2 md:gap-2.5 overflow-x-auto md:overflow-visible">
                {gallery.map((g, i) => {
                  const isActive = i === activeImg;
                  return (
                    <button
                      key={`${g.id}-${i}`}
                      type="button"
                      onClick={() => {
                        setActiveImg(i);
                        setAutoplay(false);
                      }}
                      aria-label={chrome.isEn ? `View image ${i + 1} of ${gallery.length}` : `查看图片 ${i + 1} / ${gallery.length}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`flex-shrink-0 w-[72px] h-[72px] md:w-[80px] md:h-[80px] rounded-md overflow-hidden bg-ink-100 border-2 transition-colors ${
                        isActive ? 'border-orange-700' : 'border-transparent hover:border-ink-300'
                      }`}
                    >
                      {g.cover?.startsWith('/') || g.cover?.startsWith('http') ? (
                        <Image
                          src={g.cover}
                          alt={g.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[28px]">📦</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main image — hover zoom + click lightbox */}
              <div
                className="group relative aspect-square bg-ink-100 rounded-md overflow-hidden flex items-center justify-center cursor-zoom-in"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setZoomPos({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  });
                }}
                onMouseEnter={() => setAutoplay(false)}
                onMouseLeave={() => {
                  setZoomPos(null);
                  setAutoplay(true);
                }}
                onClick={() => {
                  setLightboxImg(activeImg);
                  setLightboxOpen(true);
                  setAutoplay(false);
                }}
                role="button"
                tabIndex={0}
                aria-label={chrome.isEn ? `View ${activeImage.name} full screen` : `全屏查看 ${activeImage.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLightboxImg(activeImg);
                    setLightboxOpen(true);
                    setAutoplay(false);
                  }
                }}
              >
                {activeImage.cover?.startsWith('/') || activeImage.cover?.startsWith('http') ? (
                  <Image
                    key={activeImage.cover}
                    src={activeImage.cover}
                    alt={activeImage.name}
                    width={800}
                    height={800}
                    className="w-full h-full object-cover transition-opacity"
                    style={
                      zoomPos
                        ? {
                            transform: 'scale(1.8)',
                            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="text-[140px]">📦</div>
                )}

                {/* Image counter + zoom hint */}
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2 py-1 rounded pointer-events-none">
                  {activeImg + 1} / {gallery.length}
                </div>
                <div className="absolute top-3 left-3 bg-black/60 text-white text-[10.5px] font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {chrome.isEn ? 'Hover to zoom · Click to expand' : '悬停放大 · 点击看全屏'}
                </div>
              </div>
            </div>

            {/* v30: 自动轮播开关 + 键盘提示 */}
            <div className="mt-3 flex items-center justify-between text-[11.5px] text-ink-500">
              <button
                type="button"
                onClick={() => setAutoplay((v) => !v)}
                aria-pressed={autoplay}
                className="inline-flex items-center gap-1.5 hover:text-orange-700 transition-colors"
              >
                {autoplay ? '⏸' : '▶'} {chrome.isEn ? (autoplay ? 'Pause autoplay' : 'Resume autoplay') : (autoplay ? '暂停轮播' : '开始轮播')}
              </button>
              <span className="hidden sm:inline">
                {chrome.isEn ? 'Tip: press ← → to switch' : '提示: 按 ← → 切换图片'}
              </span>
            </div>
          </div>

          {/* Right — info (sticky on desktop) */}
          <div className="md:col-span-5 md:sticky md:top-6 md:self-start">
            <h1 className="text-[24px] md:text-[28px] font-bold text-ink-900 leading-tight mb-3">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-5 text-[13px]">
              <span className="text-amber-500 tracking-wider">★★★★★</span>
              <span className="text-orange-700 font-bold">4.9</span>
              <span className="text-ink-300">|</span>
              <span className="text-ink-600">{t.product.reviewsSummary(sold)}</span>
              <span className="text-ink-300">|</span>
              <span className="text-teal-700 font-semibold">{t.product.inStockShort} {product.stock}</span>
            </div>

            {/* Price card — flash sale + countdown */}
            <div className="border border-orange-200 bg-gradient-to-br from-orange-50/60 to-white rounded-lg p-5 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wide text-orange-700 uppercase">
                  <span className="inline-block w-1.5 h-1.5 bg-orange-700 rounded-full animate-pulse" />
                  {t.product.saleBadge} · {t.product.flashSaleTitle}
                </span>
                <div className="text-[11.5px] text-ink-700 font-semibold">
                  {t.product.flashSaleEndsIn}
                  <span className="ml-1.5 font-mono text-orange-700 tabular-nums">
                    {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-[36px] font-bold text-orange-700 leading-none">
                  {sym}{Number(product.price || 0).toFixed(2)}
                </span>
                <span className="text-ink-500 text-[15px] line-through">
                  {sym}{(Number(product.price || 0) * 2.5).toFixed(2)}
                </span>
                <span className="ml-auto bg-orange-700 text-white text-[11px] font-bold px-2 py-0.5 rounded">-60%</span>
              </div>
              {/* Stock progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11.5px] text-ink-600 mb-1.5">
                  <span className="font-semibold">{t.product.soldProgress(sold, product.stock)}</span>
                  {product.stock < 20 && (
                    <span className="text-rose-700 font-bold flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-rose-700 rounded-full animate-pulse" />
                      {t.product.stockLowHint} · {product.stock}{t.product.stockLowUnit}
                    </span>
                  )}
                </div>
                <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.min(100, Math.round((sold / (sold + product.stock)) * 100))} aria-valuemin={0} aria-valuemax={100} aria-label={t.product.soldProgress(sold, product.stock)}>
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-700 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((sold / (sold + product.stock)) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-orange-100/60 text-[12px] text-ink-600">
                {t.product.freeShipNote}
              </div>
            </div>

            {/* Variants — 颜色 + 容量 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12px] text-ink-500">{t.product.colorLabel}</span>
                <span className="text-[11px] text-ink-700 font-semibold">{variantColor === 'gray' ? t.product.colorGray : t.product.colorSilver}</span>
              </div>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setVariantColor('gray')}
                  aria-pressed={variantColor === 'gray'}
                  className={`flex-1 h-10 rounded-md text-[12.5px] font-semibold border-2 transition-colors ${
                    variantColor === 'gray' ? 'border-orange-700 text-ink-900 bg-orange-50/40' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-neutral-700 align-middle mr-1.5" />
                  {t.product.colorGray}
                </button>
                <button
                  type="button"
                  onClick={() => setVariantColor('silver')}
                  aria-pressed={variantColor === 'silver'}
                  className={`flex-1 h-10 rounded-md text-[12.5px] font-semibold border-2 transition-colors ${
                    variantColor === 'silver' ? 'border-orange-700 text-ink-900 bg-orange-50/40' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-neutral-300 align-middle mr-1.5" />
                  {t.product.colorSilver}
                </button>
              </div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12px] text-ink-500">{t.product.sizeLabel}</span>
                <span className="text-[11px] text-ink-700 font-semibold">{variantSize === '512GB' ? t.product.size512 : t.product.size1tb}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVariantSize('512GB')}
                  aria-pressed={variantSize === '512GB'}
                  className={`flex-1 h-10 rounded-md text-[12.5px] font-semibold border-2 transition-colors ${
                    variantSize === '512GB' ? 'border-orange-700 text-ink-900 bg-orange-50/40' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {t.product.size512}
                </button>
                <button
                  type="button"
                  onClick={() => setVariantSize('1TB')}
                  aria-pressed={variantSize === '1TB'}
                  className={`flex-1 h-10 rounded-md text-[12.5px] font-semibold border-2 transition-colors ${
                    variantSize === '1TB' ? 'border-orange-700 text-ink-900 bg-orange-50/40' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {t.product.size1tb}
                </button>
              </div>
            </div>

            {/* Service guarantees — expandable */}
            <div className="mb-5 border border-ink-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-ink-50 text-[12px] font-bold text-ink-700 tracking-wide">
                {t.product.guaranteeTitle}
              </div>
              {[
                { key: '7day', label: t.product.guarantee7day, desc: t.product.guarantee7dayDesc, icon: '🔁' },
                { key: 'auth', label: t.product.guaranteeAuth, desc: t.product.guaranteeAuthDesc, icon: '✓' },
                { key: 'ship', label: t.product.guaranteeShip, desc: t.product.guaranteeShipDesc, icon: '🚚' },
                { key: 'warranty', label: t.product.guaranteeWarranty, desc: t.product.guaranteeWarrantyDesc, icon: '🛡' },
              ].map((g) => {
                const isOpen = expandedGuarantee === g.key;
                return (
                  <div key={g.key} className="border-t border-ink-100">
                    <button
                      type="button"
                      onClick={() => setExpandedGuarantee(isOpen ? null : g.key)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50/50 transition-colors text-left"
                    >
                      <span className="text-[15px]">{g.icon}</span>
                      <span className="flex-1">{g.label}</span>
                      <span
                        aria-hidden="true"
                        className={`text-ink-400 text-[12px] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        ▾
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 pl-11 text-[12px] text-ink-600 leading-[1.7]">
                        {g.desc}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Qty */}
            <div className="mb-5">
              <div className="text-[12px] text-ink-500 mb-2">{t.product.qty}</div>
              <div className="inline-flex items-center border border-ink-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 hover:bg-ink-50 text-[16px] font-bold"
                  aria-label={t.cart.qtyDecLabel}
                >−</button>
                <span className="w-12 text-center text-[14px] font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="w-10 h-10 hover:bg-ink-50 text-[16px] font-bold"
                  aria-label={t.cart.qtyIncLabel}
                >+</button>
              </div>
            </div>

            {/* CTA — single primary + secondary + wish */}
            <div className="flex gap-2.5 mb-2.5">
              <button
                onClick={() => router.push('/cart')}
                className="flex-1 h-[48px] bg-orange-700 hover:bg-orange-800 text-white text-[14.5px] font-bold rounded-md transition-colors"
              >
                {t.cta.buyNow}
              </button>
              <button
                onClick={onAdd}
                className="flex-1 h-[48px] bg-white border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white text-[14.5px] font-bold rounded-md transition-colors"
              >
                {added ? '✓ ' + t.cart.orderPlaced : t.cta.addToCart}
              </button>
            </div>
            <button
              onClick={() => toggleWish(productId)}
              className={`w-full h-[44px] rounded-md text-[13.5px] font-semibold transition-colors ${
                isWished ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-white text-ink-700 hover:bg-ink-50 border border-ink-200'
              }`}
            >
              {isWished ? '♥ 已收藏' : '♡ 加入收藏'}
            </button>
          </div>
        </div>

        {/* Below the fold: 4-tab content (Features / Specs / Reviews / Shipping) */}
        <DetailTabs
          product={product}
          categoryLabel={categoryLabel}
          dateStr={dateStr}
          sold={sold}
          chromeIsEn={chrome.isEn}
          t={t}
        />

        {/* v30: 图文视频 + 对比表 — 仅产品提供了 galleryImages 时展示 */}
        {product.galleryImages && product.galleryImages.length > 0 && (
          <ProductShowcase
            galleryImages={product.galleryImages}
            videoPoster={product.videoPoster}
            videoCaption={chrome.isEn ? (product.videoCaption?.en ?? product.videoCaption?.zh) : product.videoCaption?.zh}
            competitors={product.competitors}
            chromeIsEn={chrome.isEn}
            t={t}
          />
        )}

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[20px] md:text-[22px] font-bold text-ink-900 mb-5">
              {t.product.related}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={currency}
                  onClick={(id) => router.push(`/shop/${id}`)}
                />
              ))}
            </div>
          </section>
        )}

        <ServiceStrip />
      </main>

      {/* v30: Lightbox modal */}
      {lightboxOpen && (
        <Lightbox
          gallery={gallery}
          lightboxImg={lightboxImg}
          setLightboxImg={setLightboxImg}
          onClose={() => {
            setLightboxOpen(false);
            setAutoplay(true);
          }}
          chromeIsEn={chrome.isEn}
        />
      )}

      <Footer />
    </>
  );
}

/* Detail tabs — single client component, 4 sections stacked (no real
 * tabs; mobile-friendly full sections). Each section has a small anchor id
 * for in-page navigation. */
function DetailTabs({
  product,
  categoryLabel,
  dateStr,
  sold,
  chromeIsEn,
  t,
}: {
  product: Product;
  categoryLabel: string;
  dateStr: string;
  sold: number;
  chromeIsEn: boolean;
  t: ReturnType<typeof useT>;
}) {
  const [active, setActive] = useState<'features' | 'specs' | 'reviews' | 'shipping'>('features');
  // v29: reviews sort/filter/helpful state
  const [reviewSort, setReviewSort] = useState<'latest' | 'helpful' | 'ratingDesc'>('latest');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'withPic' | 'five' | 'four' | 'verified'>('all');
  const [helpfulClicks, setHelpfulClicks] = useState<Record<number, boolean>>({});
  const tabs: { key: typeof active; label: string }[] = [
    { key: 'features', label: t.product.featuresLabel },
    { key: 'specs', label: t.product.specsLabel },
    { key: 'reviews', label: t.product.reviewsLabel },
    { key: 'shipping', label: t.product.shippingLabel },
  ];

  // v29: highlights + 多段描述 (默认 4 段模板,商品提供 longDescription 时覆盖)
  const defaultHighlights = chromeIsEn
    ? ['Hand-checked before shipping', '7-day no-reason returns', 'One-year warranty']
    : ['出库前逐一复核', '7 天无理由退换', '一年质保'];
  const defaultParas = chromeIsEn ? [
    'A carefully selected piece, ready to ship from our global warehouses.',
    'Every piece is hand-checked by our team before shipping. If anything feels off within 7 days, we cover return shipping — no questions asked.',
    'Free worldwide shipping over $50, 3–7 day delivery to 28 countries.',
    'One-year warranty on electronics. Authorized service centers in major cities.',
  ] : [
    '一件精挑细选的好物,从全球仓库发货,直送到您手中。',
    '每一件商品出库前均由我们团队逐一复核。如有任不满意,7 天内可无理由退换,运费我们承担。',
    '满 $50 全球包邮 · 预计 3–7 个工作日送达 28 国。',
    '数码商品一年质保 · 主要城市均有授权服务点。',
  ];
  const highlights = product.highlights && product.highlights.length > 0
    ? product.highlights.map((h) => (chromeIsEn ? (h.en ?? h.zh) : h.zh))
    : defaultHighlights;
  const longDesc = product.longDescription && product.longDescription.length > 0
    ? product.longDescription.map((p) => (chromeIsEn ? (p.en ?? p.zh) : p.zh))
    : defaultParas;

  // v29: specs 分组 — 商品提供 specs 时用，否则用 6 行基础模板
  const fallbackSpecs = [
    { label: t.product.skuLabel, value: `#${String(product.id).padStart(4, '0')}` },
    { label: t.product.categoryLabel, value: categoryLabel },
    { label: t.label.price, value: `$${Number(product.price || 0).toFixed(2)}` },
    { label: t.product.inStockShort, value: `${product.stock} ${t.label.pcs}` },
    { label: t.product.soldLabel, value: `${sold} ${t.label.pcs}` },
    { label: t.product.addedOnLabel, value: dateStr },
  ];
  const pickText = (s: { zh: string; en?: string } | undefined) =>
    s ? (chromeIsEn ? (s.en ?? s.zh) : s.zh) : '';
  const specsGroups: { key: string; label: string; items: { label: string; value: string }[] }[] = product.specs
    ? [
        { key: 'base', label: t.product.specsGroupBase, items: (product.specs.base ?? []).map((x) => ({ label: pickText(x.label), value: pickText(x.value) })) },
        { key: 'perf', label: t.product.specsGroupPerf, items: (product.specs.perf ?? []).map((x) => ({ label: pickText(x.label), value: pickText(x.value) })) },
        { key: 'display', label: t.product.specsGroupDisplay, items: (product.specs.display ?? []).map((x) => ({ label: pickText(x.label), value: pickText(x.value) })) },
        { key: 'battery', label: t.product.specsGroupBattery, items: (product.specs.battery ?? []).map((x) => ({ label: pickText(x.label), value: pickText(x.value) })) },
        { key: 'ports', label: t.product.specsGroupPorts, items: (product.specs.ports ?? []).map((x) => ({ label: pickText(x.label), value: pickText(x.value) })) },
        { key: 'pkg', label: t.product.specsGroupPackage, items: (product.specs.pkg ?? []).map((x) => ({ label: pickText(x.label), value: pickText(x.value) })) },
      ].filter((g) => g.items.length > 0)
    : [{ key: 'base', label: t.product.specsGroupBase, items: fallbackSpecs }];

  return (
    <section className="border-t border-ink-200 pt-10">
      {/* Sticky tab bar */}
      <div className="flex gap-1 border-b border-ink-200 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            aria-pressed={active === tab.key}
            className={`px-5 py-3 text-[13px] font-semibold tracking-wide whitespace-nowrap border-b-2 transition-colors ${
              active === tab.key
                ? 'border-orange-700 text-orange-700'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-[18px] font-bold text-ink-900 mb-3">{t.product.highlightsLabel}</h2>
            <ul className="mb-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-md bg-orange-50/60 border border-orange-100 px-3.5 py-2.5 text-[13.5px] text-ink-800 leading-snug"
                >
                  <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-orange-700 text-white flex items-center justify-center text-[11px] font-bold">✓</span>
                  {h}
                </li>
              ))}
            </ul>

            <h2 className="text-[18px] font-bold text-ink-900 mb-3">{t.product.featuresLabel}</h2>
            <div className="text-[15px] text-ink-700 leading-[1.85] space-y-3">
              {longDesc.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
          <aside className="bg-ink-50 rounded-lg p-5 text-[13px] text-ink-600 self-start">
            <div className="font-semibold text-ink-900 mb-2">{chromeIsEn ? 'In the box' : '包装清单'}</div>
            <ul className="space-y-1.5">
              <li>· {chromeIsEn ? 'Main unit' : '主机 ×1'}</li>
              <li>· {chromeIsEn ? 'Quick-start guide' : '快速上手指南 ×1'}</li>
              <li>· {chromeIsEn ? 'Warranty card' : '保修卡 ×1'}</li>
            </ul>
          </aside>
        </div>
      )}

      {active === 'specs' && (
        <div className="max-w-[820px]">
          <h2 className="text-[18px] font-bold text-ink-900 mb-5">{t.product.specsLabel}</h2>
          <div className="space-y-6">
            {specsGroups.map((g) => (
              <div key={g.key}>
                <h3 className="text-[13.5px] font-bold text-orange-700 tracking-wide uppercase mb-2.5">{g.label}</h3>
                <dl className="divide-y divide-ink-100 border-y border-ink-100">
                  {g.items.map((s, i) => (
                    <div key={`${g.key}-${i}`} className="grid grid-cols-3 gap-4 py-3 text-[13.5px]">
                      <dt className="text-ink-500">{s.label}</dt>
                      <dd className="col-span-2 text-ink-900 font-semibold leading-relaxed">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === 'reviews' && (() => {
        // 筛选
        const filtered = FAKE_REVIEWS.filter((r) => {
          if (reviewFilter === 'withPic') return !!r.withPic;
          if (reviewFilter === 'five') return r.stars === 5;
          if (reviewFilter === 'four') return r.stars === 4;
          if (reviewFilter === 'verified') return !!r.verified;
          return true;
        });
        // 排序
        const sorted = [...filtered].sort((a, b) => {
          if (reviewSort === 'latest') return b.date.localeCompare(a.date);
          if (reviewSort === 'helpful') return b.helpful - a.helpful;
          return b.stars - a.stars;
        });
        const filterChips: { key: typeof reviewFilter; label: string }[] = [
          { key: 'all', label: t.product.reviewFilterAll },
          { key: 'verified', label: t.product.reviewFilterVerified },
          { key: 'withPic', label: t.product.reviewFilterWithPic },
          { key: 'five', label: t.product.reviewFilterFiveStar },
          { key: 'four', label: t.product.reviewFilterFourStar },
        ];
        return (
          <div>
            <div className="flex items-baseline gap-3 mb-5 flex-wrap">
              <h2 className="text-[18px] font-bold text-ink-900">{t.product.reviewsLabel}</h2>
              <span className="text-[13px] text-ink-500">{t.product.reviewsSummary(sold)}</span>
              <span className="text-[20px] font-bold text-orange-700">4.9</span>
              <span className="text-amber-500">★★★★★</span>
            </div>

            {/* Filter chips + Sort dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-5 border-b border-ink-100">
              <div className="flex flex-wrap gap-2">
                {filterChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setReviewFilter(c.key)}
                    aria-pressed={reviewFilter === c.key}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                      reviewFilter === c.key
                        ? 'bg-orange-700 text-white'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-ink-600">
                <span>{t.product.reviewSortLabel}:</span>
                <select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as typeof reviewSort)}
                  aria-label={t.product.reviewSortLabel}
                  className="bg-white border border-ink-200 rounded-md px-2 py-1 text-[12.5px] font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                >
                  <option value="latest">{t.product.reviewSortLatest}</option>
                  <option value="helpful">{t.product.reviewSortHelpful}</option>
                  <option value="ratingDesc">{t.product.reviewSortRatingDesc}</option>
                </select>
              </label>
            </div>

            {sorted.length === 0 ? (
              <div className="py-12 text-center text-ink-500">
                <div className="text-[15px] font-semibold text-ink-900 mb-1">{t.product.reviewEmptyTitle}</div>
                <div className="text-[13px]">{t.product.reviewEmptyDesc}</div>
              </div>
            ) : (
              <ul className="space-y-6 max-w-[820px]">
                {sorted.map((r, i) => {
                  const clicked = !!helpfulClicks[i];
                  const helpfulCount = r.helpful + (clicked ? 1 : 0);
                  return (
                    <li key={i} className="border-b border-ink-100 pb-6 last:border-b-0">
                      <div className="flex items-baseline justify-between mb-1.5 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-ink-900">{r.name}</span>
                          <span className="text-amber-500 text-[12px] tracking-wider">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                          {r.verified && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                              ✓ {t.product.reviewFilterVerified}
                            </span>
                          )}
                          {r.withPic && (
                            <span className="inline-flex items-center text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                              📷
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-ink-500">{r.date}</span>
                      </div>
                      <div className="text-[12px] text-ink-500 mb-2">{r.role}</div>
                      <div className="text-[14px] font-semibold text-ink-900 mb-1">{r.title}</div>
                      <p className="text-[14px] text-ink-700 leading-[1.7] mb-3">{r.body}</p>
                      <button
                        type="button"
                        onClick={() => setHelpfulClicks((s) => ({ ...s, [i]: !s[i] }))}
                        aria-pressed={clicked}
                        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1 rounded-full border transition-colors ${
                          clicked
                            ? 'bg-orange-700 text-white border-orange-700'
                            : 'bg-white text-ink-700 border-ink-200 hover:border-orange-700 hover:text-orange-700'
                        }`}
                      >
                        👍 {t.product.reviewHelpfulBtn} · {t.product.reviewHelpfulCount(helpfulCount)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })()}

      {active === 'shipping' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px]">
          <div>
            <h3 className="text-[16px] font-bold text-ink-900 mb-2">{chromeIsEn ? 'Shipping' : '配送'}</h3>
            <ul className="space-y-2 text-[14px] text-ink-700 leading-[1.7]">
              <li>· {chromeIsEn ? 'Free worldwide shipping over $50' : '满 $50 全球包邮'}</li>
              <li>· {chromeIsEn ? 'Dispatched within 48 hours from local warehouses' : '本地仓 48 小时内出库'}</li>
              <li>· {chromeIsEn ? 'Estimated 3–7 business days, 28 countries' : '预计 3–7 个工作日送达 · 28 国'}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-ink-900 mb-2">{chromeIsEn ? 'Returns' : '退换'}</h3>
            <ul className="space-y-2 text-[14px] text-ink-700 leading-[1.7]">
              <li>· {chromeIsEn ? '7-day no-reason returns' : '7 天无理由退换'}</li>
              <li>· {chromeIsEn ? 'Return shipping covered by us' : '退货运费由我们承担'}</li>
              <li>· {chromeIsEn ? 'One-year warranty on all electronics' : '数码商品一年质保'}</li>
            </ul>
          </div>
        </div>
      )}

      {/* v29: FAQ section — always visible, below tabs */}
      <FaqSection t={t} chromeIsEn={chromeIsEn} />
    </section>
  );
}

/* v29: FAQ — native <details> accordion (a11y friendly, no extra JS state) */
function FaqSection({ t, chromeIsEn }: { t: ReturnType<typeof useT>; chromeIsEn: boolean }) {
  const faqs: { q: string; a: string }[] = [
    { q: t.product.faqShipping, a: t.product.faqShippingA },
    { q: t.product.faqReturn, a: t.product.faqReturnA },
    { q: t.product.faqWarranty, a: t.product.faqWarrantyA },
    { q: t.product.faqInvoice, a: t.product.faqInvoiceA },
    { q: t.product.faqOverseas, a: t.product.faqOverseasA },
    { q: t.product.faqBulk, a: t.product.faqBulkA },
  ];
  return (
    <div className="mt-12 pt-10 border-t border-ink-200">
      <h2 className="text-[18px] font-bold text-ink-900 mb-5">{t.product.faqLabel}</h2>
      <div className="max-w-[820px] divide-y divide-ink-100 border-y border-ink-100">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group py-1"
          >
            <summary className="flex items-center justify-between gap-4 py-3.5 cursor-pointer list-none text-[14.5px] font-semibold text-ink-900 hover:text-orange-700 transition-colors">
              <span className="flex-1">{f.q}</span>
              <span
                aria-hidden="true"
                className="flex-shrink-0 w-6 h-6 rounded-full bg-ink-100 group-open:bg-orange-700 text-ink-600 group-open:text-white flex items-center justify-center text-[14px] font-bold transition-all group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-4 pr-10 text-[13.5px] text-ink-700 leading-[1.8]">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-[12.5px] text-ink-500">
        {chromeIsEn ? 'Still have questions? Reach our team at ' : '还有其它疑问?联系我们客服: '}
        <a href="mailto:support@peak-mall.demo" className="text-orange-700 font-semibold hover:underline">
          support@peak-mall.demo
        </a>
      </p>
    </div>
  );
}

/* v30: 图文视频 + 对比表 — 详情页丰富媒体部分 */
function ProductShowcase({
  galleryImages,
  videoPoster,
  videoCaption,
  competitors,
  chromeIsEn,
  t,
}: {
  galleryImages: string[];
  videoPoster?: string;
  videoCaption?: string;
  competitors?: { label: { zh: string; en?: string }; rows: { label: { zh: string; en?: string }; values: { zh: string; en?: string }[] }[] };
  chromeIsEn: boolean;
  t: ReturnType<typeof useT>;
}) {
  const pickText = (s: { zh: string; en?: string } | undefined) =>
    s ? (chromeIsEn ? (s.en ?? s.zh) : s.zh) : '';
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="mt-16 pt-10 border-t border-ink-200 space-y-12">
      {/* v30 #3.1 产品图集 — 4 张大图 */}
      <div>
        <h2 className="text-[20px] md:text-[22px] font-bold text-ink-900 mb-5">
          {t.product.productShowcaseLabel}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {galleryImages.map((src, i) => (
            <div
              key={src + i}
              className="relative aspect-square bg-ink-50 rounded-lg overflow-hidden border border-ink-100 hover:border-orange-700/40 transition-colors group"
            >
              {src.startsWith('/') || src.startsWith('http') ? (
                <Image
                  src={src}
                  alt={`Showcase ${i + 1}`}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[40px]">📦</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[11px] font-semibold px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {chromeIsEn ? `View ${i + 1}` : `图 ${i + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* v30 #3.2 视频位 — poster + ▶ 角标 */}
      {videoPoster && (
        <div>
          <h2 className="text-[20px] md:text-[22px] font-bold text-ink-900 mb-5">
            {t.product.productVideoLabel}
          </h2>
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            aria-label={chromeIsEn ? 'Play product video' : '播放产品视频'}
            className="relative block w-full max-w-[920px] mx-auto aspect-video bg-ink-50 rounded-lg overflow-hidden border border-ink-100 group hover:border-orange-700/40 transition-colors"
          >
            {videoPoster.startsWith('/') || videoPoster.startsWith('http') ? (
              <Image src={videoPoster} alt="Video poster" width={1280} height={720} className="w-full h-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="text-orange-700 text-[40px] leading-none ml-2">▶</span>
              </div>
            </div>
            {videoCaption && (
              <div className="absolute bottom-4 left-4 right-4 text-white text-[14px] font-semibold text-left drop-shadow">
                {videoCaption}
              </div>
            )}
          </button>
        </div>
      )}

      {/* v30 #3.3 模拟播放 modal — 没真实视频 */}
      {showVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={chromeIsEn ? 'Video player' : '视频播放'}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <button
            type="button"
            onClick={() => setShowVideo(false)}
            aria-label={chromeIsEn ? 'Close (Esc)' : '关闭 (Esc)'}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-[20px] font-bold flex items-center justify-center"
          >
            ×
          </button>
          <div className="text-center text-white" onClick={(e) => e.stopPropagation()}>
            <div className="text-[80px] mb-4">🎬</div>
            <div className="text-[18px] font-bold mb-2">{chromeIsEn ? 'Video preview unavailable in this demo' : 'Demo 暂不提供视频预览'}</div>
            <div className="text-[13px] text-white/70">{chromeIsEn ? 'Click anywhere to close' : '点击任意位置关闭'}</div>
          </div>
        </div>
      )}

      {/* v30 #3.4 同价位对比表 */}
      {competitors && competitors.rows.length > 0 && (
        <div>
          <h2 className="text-[20px] md:text-[22px] font-bold text-ink-900 mb-5">
            {t.product.compareLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className="text-left py-3 px-4 font-bold text-ink-900 border-b border-ink-200 sticky left-0 bg-ink-50">
                    {pickText(competitors.label)}
                  </th>
                  {competitors.rows[0].values.map((_, i) => (
                    <th
                      key={i}
                      className={`text-left py-3 px-4 font-bold border-b border-ink-200 ${
                        i === 0 ? 'bg-orange-50 text-orange-700' : 'text-ink-700'
                      }`}
                    >
                      {i === 0 ? t.product.compareThisRow : `${t.product.compareOther} ${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitors.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-ink-100 hover:bg-ink-50/40">
                    <td className="py-3 px-4 text-ink-500 font-semibold sticky left-0 bg-white">
                      {pickText(row.label)}
                    </td>
                    {row.values.map((v, vi) => (
                      <td
                        key={vi}
                        className={`py-3 px-4 font-semibold ${
                          vi === 0 ? 'text-orange-700 bg-orange-50/40' : 'text-ink-900'
                        }`}
                      >
                        {pickText(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/* v30: Lightbox modal — full-screen image viewer with keyboard nav */
function Lightbox({
  gallery,
  lightboxImg,
  setLightboxImg,
  onClose,
  chromeIsEn,
}: {
  gallery: Product[];
  lightboxImg: number;
  setLightboxImg: (n: number) => void;
  onClose: () => void;
  chromeIsEn: boolean;
}) {
  // v30: ESC 关 / ←/→ 切图
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setLightboxImg((lightboxImg - 1 + gallery.length) % gallery.length);
      else if (e.key === 'ArrowRight') setLightboxImg((lightboxImg + 1) % gallery.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImg, gallery.length, onClose]);

  // focus trap: set focus to close button on mount
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  const current = gallery[lightboxImg];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={chromeIsEn ? 'Image viewer' : '图片查看器'}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label={chromeIsEn ? 'Close image viewer (Esc)' : '关闭图片查看器 (Esc)'}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-[20px] font-bold flex items-center justify-center transition-colors"
      >
        ×
      </button>

      {/* Image counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-[12px] font-semibold px-3 py-1.5 rounded-full">
        {lightboxImg + 1} / {gallery.length}
      </div>

      {/* Prev / Next */}
      {gallery.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImg((lightboxImg - 1 + gallery.length) % gallery.length);
            }}
            aria-label={chromeIsEn ? 'Previous image (←)' : '上一张 (←)'}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-[24px] font-bold flex items-center justify-center transition-colors"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImg((lightboxImg + 1) % gallery.length);
            }}
            aria-label={chromeIsEn ? 'Next image (→)' : '下一张 (→)'}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-[24px] font-bold flex items-center justify-center transition-colors"
          >
            ›
          </button>
        </>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {current.cover?.startsWith('/') || current.cover?.startsWith('http') ? (
          <Image
            key={current.cover}
            src={current.cover}
            alt={current.name}
            width={1200}
            height={1200}
            className="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain"
          />
        ) : (
          <div className="text-[180px]">📦</div>
        )}
        <div className="text-center text-white/80 text-[12.5px] mt-3">{current.name}</div>
      </div>

      {/* Thumbnail strip */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-1">
        {gallery.map((g, i) => {
          const isActive = i === lightboxImg;
          return (
            <button
              key={`${g.id}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImg(i);
              }}
              aria-label={chromeIsEn ? `Jump to image ${i + 1}` : `跳到图片 ${i + 1}`}
              className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                isActive ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {g.cover?.startsWith('/') || g.cover?.startsWith('http') ? (
                <Image src={g.cover} alt={g.name} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-[18px]">📦</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
