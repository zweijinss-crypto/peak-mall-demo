'use client';

import { Suspense } from 'react';
import { AnnouncementBar, ShopHeader, Footer } from '@/components/peak-mall';
import { PRODUCTS } from '@/data/products';
import ProductGrid from '@/components/shop/ProductGrid';
import { usePageChrome } from '@/lib/page-nav';

export default function ShopNewPage() {
  const chrome = usePageChrome('new', 'home');

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
        <Suspense
          fallback={
            <div className="max-w-shell mx-auto px-5 py-8 min-h-[1200px] text-ink-500">
              加载中…
            </div>
          }
        >
          <ProductGrid products={PRODUCTS} mode="new" />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
