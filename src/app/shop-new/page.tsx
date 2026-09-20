'use client';

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
        <ProductGrid products={PRODUCTS} mode="new" />
      </main>

      <Footer />
    </>
  );
}
