'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMemo, useState } from 'react';
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

const FAKE_REVIEWS = [
  {
    name: '陈先生',
    role: '北京 · 数码爱好者',
    stars: 5,
    date: '2026-09-12',
    title: '出乎意料的好',
    body: '本来抱着试试看的心态,结果很满意。做工扎实,手感不错,客服回复也快。',
  },
  {
    name: 'Liu W.',
    role: 'Shanghai · Designer',
    stars: 5,
    date: '2026-08-29',
    title: 'Great value for money',
    body: 'Shipping took 4 days from overseas warehouse. Packaging was solid. Would buy again.',
  },
  {
    name: '王女士',
    role: '深圳 · 居家办公',
    stars: 4,
    date: '2026-08-15',
    title: '性价比高',
    body: '整体满意,比专柜便宜不少。扣一星是因为说明书不太全,新手可能需要摸索一下。',
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
                      onClick={() => setActiveImg(i)}
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

              {/* Main image */}
              <div className="aspect-square bg-ink-100 rounded-md overflow-hidden flex items-center justify-center">
                {activeImage.cover?.startsWith('/') || activeImage.cover?.startsWith('http') ? (
                  <Image
                    key={activeImage.cover}
                    src={activeImage.cover}
                    alt={activeImage.name}
                    width={800}
                    height={800}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-[140px]">📦</div>
                )}
              </div>
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

            {/* Price card — flat */}
            <div className="border border-ink-200 rounded-lg p-5 mb-5">
              <div className="text-[11px] tracking-[2px] uppercase text-ink-500 mb-1.5">{t.label.price}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-[36px] font-bold text-orange-700 leading-none">
                  {sym}{Number(product.price || 0).toFixed(2)}
                </span>
                <span className="text-ink-500 text-[15px] line-through">
                  {sym}{(Number(product.price || 0) * 2.5).toFixed(2)}
                </span>
                <span className="ml-auto bg-orange-700 text-white text-[11px] font-bold px-2 py-0.5 rounded">-60%</span>
              </div>
              <div className="mt-3 pt-3 border-t border-ink-100 text-[12px] text-ink-600">
                {t.product.freeShipNote}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2 mb-5">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-ink-700">
                  <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>

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
  const tabs: { key: typeof active; label: string }[] = [
    { key: 'features', label: t.product.featuresLabel },
    { key: 'specs', label: t.product.specsLabel },
    { key: 'reviews', label: t.product.reviewsLabel },
    { key: 'shipping', label: t.product.shippingLabel },
  ];

  const featureBody = chromeIsEn
    ? (product.description || 'A carefully selected piece, ready to ship from our global warehouses.')
    : (product.description || '一件精挑细选的好物,从全球仓库发货,直送到您手中。');

  const specs: { label: string; value: string }[] = [
    { label: t.product.skuLabel, value: `#${String(product.id).padStart(4, '0')}` },
    { label: t.product.categoryLabel, value: categoryLabel },
    { label: t.label.price, value: `$${Number(product.price || 0).toFixed(2)}` },
    { label: t.product.inStockShort, value: `${product.stock} ${t.label.pcs}` },
    { label: t.product.soldLabel, value: `${sold} ${t.label.pcs}` },
    { label: t.product.addedOnLabel, value: dateStr },
  ];

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
            <h2 className="text-[18px] font-bold text-ink-900 mb-3">{t.product.featuresLabel}</h2>
            <p className="text-[15px] text-ink-700 leading-[1.85]">{featureBody}</p>
            <p className="text-[15px] text-ink-700 leading-[1.85] mt-3">
              {chromeIsEn
                ? 'Every piece is hand-checked by our team before shipping. If anything feels off within 7 days, we cover return shipping — no questions asked.'
                : '每一件商品出库前均由我们团队逐一复核。如有任不满意,7 天内可无理由退换,运费我们承担。'}
            </p>
          </div>
          <aside className="bg-ink-50 rounded-lg p-5 text-[13px] text-ink-600">
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
        <div className="max-w-[720px]">
          <h2 className="text-[18px] font-bold text-ink-900 mb-4">{t.product.specsLabel}</h2>
          <dl className="divide-y divide-ink-100 border-y border-ink-100">
            {specs.map((s) => (
              <div key={s.label} className="grid grid-cols-3 gap-4 py-3 text-[13.5px]">
                <dt className="text-ink-500">{s.label}</dt>
                <dd className="col-span-2 text-ink-900 font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {active === 'reviews' && (
        <div>
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="text-[18px] font-bold text-ink-900">{t.product.reviewsLabel}</h2>
            <span className="text-[13px] text-ink-500">{t.product.reviewsSummary(sold)}</span>
            <span className="text-[20px] font-bold text-orange-700">4.9</span>
            <span className="text-amber-500">★★★★★</span>
          </div>
          <ul className="space-y-6 max-w-[760px]">
            {FAKE_REVIEWS.map((r, i) => (
              <li key={i} className="border-b border-ink-100 pb-6 last:border-b-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-ink-900">{r.name}</span>
                    <span className="text-amber-500 text-[12px] tracking-wider">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                  </div>
                  <span className="text-[12px] text-ink-500">{r.date}</span>
                </div>
                <div className="text-[12px] text-ink-500 mb-2">{r.role}</div>
                <div className="text-[14px] font-semibold text-ink-900 mb-1">{r.title}</div>
                <p className="text-[14px] text-ink-700 leading-[1.7]">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

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
    </section>
  );
}
