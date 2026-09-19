'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  ProductCard,
  ServiceStrip,
  type CurrencyCode,
  type Product,
} from '@/components/peak-mall';
import { PRODUCTS } from '@/data/products';
import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'all', label: '全部' },
  { key: 'new', label: '新品' },
  { key: 'hot', label: '热卖' },
  { key: 'orders', label: '我的订单' },
];

const CURRENCY_OPTIONS = [
  { code: 'USD' as CurrencyCode, label: 'USD 美元' },
  { code: 'CNY' as CurrencyCode, label: 'CNY 人民币' },
  { code: 'EUR' as CurrencyCode, label: 'EUR 欧元' },
];

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', AUD: 'A$', CAD: 'C$',
};

export default function ShopDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const productId = Number(id);
  const product: Product | undefined = PRODUCTS.find((p) => p.id === productId);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addToCart = usePeakStore((s) => s.addToCart);
  const toggleWish = usePeakStore((s) => s.toggleWish);
  const isWished = usePeakStore((s) => s.wishlist.some((w) => w.id === productId));

  if (!product) {
    return (
      <>
        <ShopHeader
          brand={{ name: COPY.brand.name, slogan: COPY.brand.slogan }}
          navItems={[{ key: 'home', label: '首页' }]}
          active="home"
          currencyOptions={[{ code: 'USD', label: 'USD 美元' }]}
          currency="USD"
          onCurrencyChange={() => {}}
          langOptions={[{ code: 'zh', label: '中文' }, { code: 'en', label: 'EN' }]}
          lang="zh"
          onLangChange={() => {}}
        />
        <main className="max-w-shell mx-auto px-5 py-24 text-center">
          <h1 className="text-[28px] font-extrabold text-ink-900 mb-3">
            {COPY.shop.notFoundTitle}
          </h1>
          <p className="text-ink-500 mb-8">{COPY.shop.notFoundDesc}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-ink-900 hover:bg-primary text-white text-[14px] font-bold rounded transition-colors"
          >
            {COPY.cta.backToHome}
          </button>
        </main>
        <Footer />
      </>
    );
  }

  const sym = SYMBOLS[currency] || '$';
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const onAdd = () => {
    addToCart({ id: product.id, name: product.name, price: Number(product.price), cover: product.cover }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <>
      <AnnouncementBar tag="公告" text="全场满 $50 包邮 · 7 天无理由退换" />
      <ShopHeader
        brand={{ name: COPY.brand.name, slogan: COPY.brand.slogan }}
        navItems={NAV_ITEMS}
        active="all"
        currencyOptions={CURRENCY_OPTIONS}
        currency={currency}
        onCurrencyChange={(c) => setCurrency(c as CurrencyCode)}
        langOptions={[{ code: 'zh', label: '中文' }, { code: 'en', label: 'EN' }]}
        lang="zh"
        onLangChange={() => {}}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <nav className="text-[12.5px] text-ink-500 mb-6">
          <a onClick={() => router.push('/')} className="cursor-pointer hover:text-orange-700">首页</a>
          <span className="mx-2">/</span>
          <span>{product.category}</span>
          <span className="mx-2">/</span>
          <span className="text-ink-700">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16">
          {/* Cover */}
          <div className="aspect-square bg-ink-100 rounded-[14px] overflow-hidden flex items-center justify-center">
            {product.cover?.startsWith('/') || product.cover?.startsWith('http') ? (
              <img src={product.cover} alt={product.name} width="800" height="800" className="w-full h-full object-cover" />
            ) : (
              <div className="text-[140px]">📦</div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-[26px] md:text-[30px] font-extrabold text-ink-900 leading-tight mb-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mb-5 text-[13px]">
              <span className="text-accent-gold tracking-wider">★★★★★</span>
              <span className="text-orange-700 font-bold">4.9</span>
              <span className="text-ink-300">|</span>
              <span className="bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full">{product.category}</span>
              <span className="text-ink-300">|</span>
              <span className="text-emerald-700 font-semibold">{COPY.label.inStock} {product.stock} {COPY.label.pcs}</span>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-amber-50 border border-primary-100 rounded-[14px] p-5 mb-5">
              <div className="text-[12px] text-ink-500 mb-1">{COPY.label.price}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-[36px] font-extrabold text-orange-700 leading-none">
                  {sym}{Number(product.price || 0).toFixed(2)}
                </span>
                <span className="text-ink-300 text-[15px] line-through">
                  {sym}{(Number(product.price || 0) * 2.5).toFixed(2)}
                </span>
                <span className="ml-auto bg-primary text-white text-[11.5px] font-extrabold px-2 py-0.5 rounded">-60%</span>
              </div>
            </div>

            <div className="mb-5">
              <div className="text-[13px] text-ink-500 mb-2">{COPY.product.qty}</div>
              <div className="inline-flex items-center border border-ink-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-9 h-9 hover:bg-ink-50 text-[16px]"
                  aria-label="减少"
                >−</button>
                <span className="w-12 text-center text-[14px] font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="w-9 h-9 hover:bg-ink-50 text-[16px]"
                  aria-label="增加"
                >+</button>
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                onClick={onAdd}
                className="flex-1 h-[48px] bg-white border-2 border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white text-[14.5px] font-bold tracking-wide rounded transition-colors"
              >
                {added ? '✓ ' + COPY.cart.orderPlaced : COPY.cta.addToCart}
              </button>
              <button
                onClick={() => router.push('/cart')}
                className="flex-1 h-[48px] bg-primary hover:bg-primary-dark text-white text-[14.5px] font-bold tracking-wide rounded transition-colors"
              >
                {COPY.cta.buyNow}
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
              {product.description || COPY.label.noDescription}
            </div>

            <div className="mt-3 text-[12px] text-ink-600">
              id: #{product.id} · {COPY.label.createdAt} {product.created_at && new Date(product.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[20px] md:text-[22px] font-bold text-ink-900 mb-5">
              {COPY.product.related}
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
