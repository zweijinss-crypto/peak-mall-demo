'use client';

import { useState } from 'react';
import {
  AnnouncementBar,
  CategoryBar,
  ProductCard,
  ProductModal,
  CartLine,
  DoubleBanner,
  HeroBanner,
  AuthSplit,
} from '@/components/reference';
import type { ProductWithText } from '@/components/reference/types';
import { useT, RefI18nProvider, useMockProducts, useMockCart, useMockCategories, type Lang } from '@/lib/ref-translations';

interface MockProductSeed {
  id: number;
  price: number;
  currency: 'USD';
  coverEmoji: string;
  stockStatus: 'in_stock' | 'low' | 'out';
  key: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
}

const MOCK_PRODUCT_SEEDS: MockProductSeed[] = [
  { key: 'p1', id: 1, price: 199, currency: 'USD', coverEmoji: '🎧', stockStatus: 'in_stock' },
  { key: 'p2', id: 2, price: 299, currency: 'USD', coverEmoji: '⌚', stockStatus: 'low' },
  { key: 'p3', id: 3, price:  89, currency: 'USD', coverEmoji: '🔊', stockStatus: 'in_stock' },
  { key: 'p4', id: 4, price: 399, currency: 'USD', coverEmoji: '🖥️', stockStatus: 'out' },
  { key: 'p5', id: 5, price: 129, currency: 'USD', coverEmoji: '⌨️', stockStatus: 'in_stock' },
  { key: 'p6', id: 6, price: 549, currency: 'USD', coverEmoji: '🪑', stockStatus: 'in_stock' },
];

export default function RefPeakMallDemoPage() {
  return (
    <RefI18nProvider>
      <RefPeakMallDemoInner />
    </RefI18nProvider>
  );
}

function RefPeakMallDemoInner() {
  const { t, lang, setLang } = useT();
  const products = useMockProducts();
  const cart = useMockCart();
  const categories = useMockCategories();
  const [activeCat, setActiveCat] = useState<string>(() => t('category.all'));
  const [modalProduct, setModalProduct] = useState<ProductWithText | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // 组装出 6 件商品的运行时数据 (i18n name/subtitle)
  const localizedProducts: ProductWithText[] = MOCK_PRODUCT_SEEDS.map((s) => ({
    id: s.id,
    price: s.price,
    currency: s.currency,
    coverEmoji: s.coverEmoji,
    stockStatus: s.stockStatus,
    name: products[s.key].name,
    subtitle: products[s.key].subtitle,
  }));

  return (
    <main className="min-h-screen bg-[var(--ref-gray-100)]">
      <AnnouncementBar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top bar */}
        <header className="flex items-center justify-between py-4 border-b border-[var(--ref-gray-200)] mb-6 gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[var(--ref-gray-900)]">
            reference/peak-mall/ demo
          </h1>
          <nav className="flex items-center gap-2 text-sm">
            {/* Lang switcher */}
            <LangSwitcher lang={lang} onChange={setLang} />
            <button
              onClick={() => setShowAuth(!showAuth)}
              className="px-4 py-2 rounded-lg bg-[var(--ref-primary)] text-white hover:bg-[var(--ref-primary-d)] font-semibold"
            >
              {showAuth ? t('common.backToShop') : t('common.loginToggle')}
            </button>
          </nav>
        </header>

        {showAuth ? (
          <AuthSplit
            onLogin={(d) => alert(`Login demo: ${JSON.stringify(d)}`)}
            onRegister={(d) => alert(`Register demo: ${JSON.stringify(d)}\n(${lang === 'zh' ? '无邀请码字段,合规版' : 'no invite code field, compliant'})`)}
          />
        ) : (
          <>
            <HeroBanner
              ctaLabel={t('common.shopNow')}
              onCta={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}
            />

            <section id="shop" className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--ref-gray-900)]">{t('common.recommended')}</h2>
                <span className="text-sm text-[var(--ref-gray-500)]">
                  {t('common.itemsTotal', { n: localizedProducts.length })}
                </span>
              </div>

              <CategoryBar
                cats={categories}
                active={activeCat}
                onPick={(name) => setActiveCat(name)}
              />

              <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))' }}>
                {localizedProducts.map((p) => (
                  <div key={p.id} onClick={() => setModalProduct(p)}>
                    <ProductCard
                      product={p}
                      onAddToCart={(prod) => alert(`加入购物车: ${prod.name}`)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <DoubleBanner />

            <section className="mt-12">
              <h2 className="text-2xl font-bold text-[var(--ref-gray-900)] mb-4">{t('common.cartDemo')}</h2>
              <div className="bg-white rounded-xl border border-[var(--ref-gray-200)] p-4">
                <CartLine
                  item={{
                    id: 1, name: cart.c1.name, price: 199, qty: 1,
                    coverEmoji: '🎧', currency: 'USD', subtitle: cart.c1.subtitle,
                  }}
                  onChangeQty={() => { /* ref-peak-mall demo, no-op */ }}
                  onRemove={() => { /* ref-peak-mall demo, no-op */ }}
                />
                <CartLine
                  item={{
                    id: 2, name: products.p2.name, price: 299, qty: 2,
                    coverEmoji: '⌚', currency: 'USD',
                  }}
                  onChangeQty={() => { /* ref-peak-mall demo, no-op */ }}
                  onRemove={() => { /* ref-peak-mall demo, no-op */ }}
                />
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--ref-gray-100)]">
                  <span className="text-sm text-[var(--ref-gray-500)]">{t('common.subtotal')}</span>
                  <span className="text-2xl font-bold text-[var(--ref-danger)]">USD 797.00</span>
                </div>
              </div>
            </section>

            <section className="mt-12 mb-12 p-6 rounded-xl bg-[var(--ref-gray-50)] border border-[var(--ref-gray-200)]">
              <h3 className="font-semibold text-[var(--ref-gray-700)] mb-2">{t('common.about')}</h3>
              <ul className="text-sm text-[var(--ref-gray-500)] space-y-1 list-disc list-inside">
                <li>{t('aboutItems.source', { src: 'reference/peak-mall/components' })}</li>
                <li>{t('aboutItems.copySrc', { src: 'src/lib/ref-translations.ts' })}</li>
                <li>{t('aboutItems.register')}</li>
                <li>{t('aboutItems.payment')}</li>
                <li>{t('aboutItems.tokens', { src: 'analysis/design-tokens.js' })}</li>
              </ul>
            </section>
          </>
        )}
      </div>

      <ProductModal
        product={modalProduct}
        open={modalProduct !== null}
        onClose={() => setModalProduct(null)}
        onAddToCart={(p) => alert(`加入购物车: ${p.name}`)}
      />
    </main>
  );
}

function LangSwitcher({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      className="inline-flex rounded-lg border border-[var(--ref-gray-300)] overflow-hidden text-[13px] font-semibold"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => onChange('zh')}
        aria-pressed={lang === 'zh'}
        className={[
          'px-3 py-1.5 transition-colors',
          lang === 'zh'
            ? 'bg-[var(--ref-primary)] text-white'
            : 'bg-white text-[var(--ref-gray-700)] hover:bg-[var(--ref-gray-50)]',
        ].join(' ')}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        aria-pressed={lang === 'en'}
        className={[
          'px-3 py-1.5 transition-colors border-l border-[var(--ref-gray-300)]',
          lang === 'en'
            ? 'bg-[var(--ref-primary)] text-white'
            : 'bg-white text-[var(--ref-gray-700)] hover:bg-[var(--ref-gray-50)]',
        ].join(' ')}
      >
        EN
      </button>
    </div>
  );
}