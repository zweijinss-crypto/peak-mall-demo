'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  PageBanner,
} from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/components/peak-mall/types';
import ProductCard from '@/components/peak-mall/ProductCard';

/**
 * /search?q=foo — server-side rendering can't read searchParams at static
 * export time, so the actual read happens inside <SearchInner /> wrapped in
 * <Suspense />. This is the canonical Next.js App Router pattern for using
 * useSearchParams in a static page.
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchInner />
    </Suspense>
  );
}

function SearchSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-[14px] text-ink-500">
      Loading…
    </div>
  );
}

function SearchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get('q')?.trim() ?? '';
  const [q, setQ] = useState(initialQ);
  const t = useT();
  const chrome = usePageChrome('search');

  // Keep the input in sync if the user navigates with a new ?q= (e.g. clicking
  // a hot tag link).
  useEffect(() => setQ(initialQ), [initialQ]);

  const results: Product[] = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return PRODUCTS.filter((p) => {
      const hay = `${p.name} ${p.category ?? ''} ${p.description ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = q.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active="search"
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
        initialQuery={q}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        {/* Search form (always visible, also reachable from header) */}
        <form
          role="search"
          onSubmit={submit}
          className="flex items-center gap-2 mb-6 max-w-[640px]"
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.hero.searchPlaceholder}
            className="flex-1 px-4 h-[44px] bg-white border border-ink-200 rounded-full outline-none focus:border-orange-500 text-[14px]"
            aria-label={t.hero.searchPlaceholder}
          />
          <button
            type="submit"
            className="px-5 h-[44px] bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-bold rounded-full transition-colors"
          >
            {chrome.isEn ? 'Search' : '搜索'}
          </button>
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); router.push('/search'); }}
              className="px-3 h-[44px] text-[13px] text-ink-500 hover:text-rose-700 transition-colors"
            >
              {t.search.clear}
            </button>
          )}
        </form>

        <PageBanner
          title={t.search.title}
          subtitle={q
            ? results.length > 0
              ? t.search.subCount(results.length, q)
              : t.search.subEmpty(q)
            : (chrome.isEn ? 'Type a keyword to start searching.' : '输入关键词开始搜索。')}
        />

        <h1 className="sr-only">{t.search.title}</h1>

        {q && results.length > 0 ? (
          <section
            aria-label={t.search.title}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </section>
        ) : q ? (
          /* Empty state */
          <section
            aria-label={t.search.title}
            className="bg-white rounded-xl py-14 text-center border border-ink-100"
          >
            <div className="text-[56px] mb-3" aria-hidden="true">🔍</div>
            <div className="text-[16px] font-bold text-ink-900 mb-2">
              {t.search.subEmpty(q)}
            </div>
            <div className="text-[13px] text-ink-500 mb-5">{t.search.suggest}</div>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors"
            >
              {t.search.backHome} →
            </button>

            {/* Hot tags */}
            <div className="mt-8">
              <div className="text-[12px] font-bold text-ink-500 tracking-wider uppercase mb-3">
                {t.search.hot}
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-[480px] mx-auto">
                {t.search.hotTags.map((tag: string) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                    className="px-3.5 py-1.5 bg-ink-50 hover:bg-orange-50 text-[12.5px] text-ink-700 hover:text-orange-700 rounded-full border border-ink-100 hover:border-orange-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          /* No query yet — show hot tags inline */
          <section aria-label={t.search.hot} className="bg-white rounded-xl p-6 border border-ink-100">
            <div className="text-[12px] font-bold text-ink-500 tracking-wider uppercase mb-3">
              {t.search.hot}
            </div>
            <div className="flex flex-wrap gap-2">
              {t.search.hotTags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                  className="px-3.5 py-1.5 bg-ink-50 hover:bg-orange-50 text-[12.5px] text-ink-700 hover:text-orange-700 rounded-full border border-ink-100 hover:border-orange-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}