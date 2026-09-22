'use client';

import { Suspense } from 'react';
import { AnnouncementBar, ShopHeader, Footer } from '@/components/peak-mall';
import { PRODUCTS } from '@/data/products';
import ProductGrid from '@/components/shop/ProductGrid';
import { usePageChrome } from '@/lib/page-nav';

export default function ShopAllPage() {
  const chrome = usePageChrome('all', 'home');

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active={chrome.active}
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main>
        {/* ProductGrid reads ?cat=... via useSearchParams; wrap in Suspense for static export.
            Fallback must reserve enough vertical space to avoid CLS once the
            client component hydrates — a one-line "加载中…" leaves the page
            with ~32px of content and pushes the footer up several hundred px
            after hydration. 1200px matches the typical desktop ProductGrid. */}
        <Suspense
          fallback={
            <div className="max-w-shell mx-auto px-5 py-8 min-h-[1200px] text-ink-500">
              加载中…
            </div>
          }
        >
          <ProductGrid products={PRODUCTS} mode="all" />
        </Suspense>
      </main>

      <Footer locale={chrome.isEn ? 'en' : 'zh'} />
    </>
  );
}
