'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  ProductCard,
  ServiceStrip,
  type Product,
} from '@/components/peak-mall';
import { PRODUCTS } from '@/data/products';
import { usePeakStore, type CurrencyCode } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', AUD: 'A$', CAD: 'C$',
};

export default function ShopDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('home', 'home');
  const productId = Number(id);
  const product: Product | undefined = PRODUCTS.find((p) => p.id === productId);

  // Hooks must run unconditionally — call them all before any early-return.
  const currency = chrome.currency;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState<number>(0);
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
          <h1 className="text-[28px] font-extrabold text-ink-900 mb-3">
            {t.shop.notFoundTitle}
          </h1>
          <p className="text-ink-500 mb-8">{t.shop.notFoundDesc}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-ink-900 hover:bg-primary text-white text-[14px] font-bold rounded transition-colors"
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
        {/* Breadcrumb — Link-based for SEO + Next prefetch */}
        <nav
          aria-label={chrome.isEn ? 'Breadcrumb' : '面包屑'}
          className="text-[12.5px] text-ink-500 mb-6 flex items-center flex-wrap gap-x-1.5 gap-y-1"
        >
          <Link href="/" className="hover:text-orange-700 transition-colors">
            {chrome.isEn ? 'Home' : '首页'}
          </Link>
          <span aria-hidden="true" className="text-ink-300">/</span>
          <Link
            href={`/#recommended?cat=${encodeURIComponent(product.category)}`}
            className="hover:text-orange-700 transition-colors"
          >
            {product.category}
          </Link>
          <span aria-hidden="true" className="text-ink-300">/</span>
          <span className="text-ink-700 font-semibold truncate max-w-[280px]" aria-current="page">
            {product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-[88px_1fr] gap-4 mb-16">
          {/* Thumbnail rail (vertical on md+) */}
          <div className="order-2 md:order-1 flex md:flex-col gap-2 md:gap-2.5 overflow-x-auto md:overflow-visible">
            {gallery.map((g, i) => {
              const isActive = i === activeImg;
              return (
                <button
                  key={`${g.id}-${i}`}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={chrome.isEn ? `View image ${i + 1} of ${gallery.length}` : `查看图片 ${i + 1} / ${gallery.length}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex-shrink-0 w-[72px] h-[72px] md:w-[80px] md:h-[80px] rounded-[10px] overflow-hidden bg-ink-100 border-2 transition-all ${
                    isActive
                      ? 'border-orange-700 shadow-glow scale-[1.02]'
                      : 'border-transparent hover:border-ink-300'
                  }`}
                >
                  {g.cover?.startsWith('/') || g.cover?.startsWith('http') ? (
                    <img
                      src={g.cover}
                      alt={g.name}
                      width="80"
                      height="80"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[28px]">📦</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main image */}
          <div className="order-1 md:order-2 aspect-square bg-ink-100 rounded-[14px] overflow-hidden flex items-center justify-center">
            {activeImage.cover?.startsWith('/') || activeImage.cover?.startsWith('http') ? (
              <img
                key={activeImage.cover}
                src={activeImage.cover}
                alt={activeImage.name}
                width="800"
                height="800"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-[140px]">📦</div>
            )}
          </div>
        </div>

        {/* Info below gallery */}
        <div className="max-w-[640px] mb-16">
            <h1 className="text-[26px] md:text-[30px] font-extrabold text-ink-900 leading-tight mb-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mb-5 text-[13px]">
              <span className="text-accent-gold tracking-wider">★★★★★</span>
              <span className="text-orange-700 font-bold">4.9</span>
              <span className="text-ink-300">|</span>
              <span className="bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full">{product.category}</span>
              <span className="text-ink-300">|</span>
              <span className="text-emerald-700 font-semibold">{t.label.inStock} {product.stock} {t.label.pcs}</span>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-amber-50 border border-primary-100 rounded-[14px] p-5 mb-5">
              <div className="text-[12px] text-ink-500 mb-1">{t.label.price}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-[36px] font-extrabold text-orange-700 leading-none">
                  {sym}{Number(product.price || 0).toFixed(2)}
                </span>
                <span className="text-ink-300 text-[15px] line-through">
                  {sym}{(Number(product.price || 0) * 2.5).toFixed(2)}
                </span>
                <span className="ml-auto bg-orange-700 text-white text-[11.5px] font-extrabold px-2 py-0.5 rounded">-60%</span>
              </div>
            </div>

            <div className="mb-5">
              <div className="text-[13px] text-ink-500 mb-2">{t.product.qty}</div>
              <div className="inline-flex items-center border border-ink-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-9 h-9 hover:bg-ink-50 text-[16px]"
                  aria-label={t.cart.qtyDecLabel}
                >−</button>
                <span className="w-12 text-center text-[14px] font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="w-9 h-9 hover:bg-ink-50 text-[16px]"
                  aria-label={t.cart.qtyIncLabel}
                >+</button>
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                onClick={onAdd}
                className="flex-1 h-[48px] bg-white border-2 border-orange-700 text-orange-700 hover:bg-orange-50 text-[14.5px] font-bold tracking-wide rounded-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                {added ? '✓ ' + t.cart.orderPlaced : t.cta.addToCart}
              </button>
              <button
                onClick={() => router.push('/cart')}
                className="flex-1 h-[48px] bg-gradient-to-b from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-[14.5px] font-bold tracking-wide rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(234,88,12,0.25)] hover:shadow-[0_6px_18px_rgba(234,88,12,0.35)]"
              >
                {t.cta.buyNow}
              </button>
            </div>
            <button
              onClick={() => toggleWish(productId)}
              className={`w-full h-[44px] rounded text-[13.5px] font-semibold transition-colors ${
                isWished ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-ink-50 text-ink-700 hover:bg-ink-100 border border-ink-200'
              }`}
            >
              {isWished ? '♥ 已收藏' : '♡ 加入收藏'}
            </button>

            <div className="text-[14px] text-ink-700 leading-[1.85] p-4 bg-ink-50 rounded-[10px] border border-ink-100 mt-5">
              {product.description || t.label.noDescription}
            </div>

            <div className="mt-3 text-[12px] text-ink-600">
              id: #{product.id} · {t.label.createdAt} {product.created_at ? new Date(product.created_at).toISOString().slice(0, 10) : '—'}
            </div>
        </div>

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

      <Footer />
    </>
  );
}
