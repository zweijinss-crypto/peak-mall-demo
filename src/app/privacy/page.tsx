'use client';

import { AnnouncementBar, ShopHeader, Footer } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function PrivacyPage() {
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

      <main className="max-w-shell mx-auto px-5 py-10">
        <div className="max-w-3xl">
          <div className="text-[11px] tracking-[1.5px] uppercase font-bold text-ink-500 mb-2">
            Legal
          </div>
          <h1 className="text-[26px] md:text-[30px] font-extrabold text-ink-900 leading-tight mb-2">
            {t.legal.privacyTitle}
          </h1>
          <p className="text-[12.5px] text-ink-500 mb-8">
            {t.legal.lastUpdated}: 2026-09-20
          </p>

          <div className="space-y-7">
            {t.legal.privacySections.map((s: { heading: string; body: string }, i: number) => (
              <section key={i}>
                <h2 className="text-[16px] md:text-[17px] font-bold text-ink-900 mb-2 leading-tight">
                  {s.heading}
                </h2>
                <p className="text-[14.5px] text-ink-700 leading-[1.85]">
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