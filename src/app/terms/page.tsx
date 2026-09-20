'use client';

import { AnnouncementBar, ShopHeader, Footer } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function TermsPage() {
  const t = useT();
  const chrome = usePageChrome('about');

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

      <main className="max-w-shell mx-auto px-5 py-12">
        <div className="max-w-3xl">
          <div className="text-[12.5px] tracking-[2px] uppercase font-bold text-ink-500 mb-3">
            Legal
          </div>
          <h1 className="text-[36px] md:text-[44px] font-extrabold text-ink-900 leading-tight mb-3">
            {t.legal.termsTitle}
          </h1>
          <p className="text-[13px] text-ink-500 mb-10">
            {t.legal.lastUpdated}: 2026-09-20
          </p>

          <div className="space-y-8">
            {t.legal.termsSections.map((s: { heading: string; body: string }, i: number) => (
              <section key={i}>
                <h2 className="text-[20px] md:text-[22px] font-bold text-ink-900 mb-3 leading-tight">
                  {s.heading}
                </h2>
                <p className="text-[15.5px] text-ink-700 leading-[1.85]">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}