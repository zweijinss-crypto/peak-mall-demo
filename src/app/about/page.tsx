'use client';

import { useRouter } from 'next/navigation';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function AboutPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('about');

  const STATS = [
    { value: t.about.statCountries, label: t.about.statCountriesLabel },
    { value: t.about.statShops, label: t.about.statShopsLabel },
    { value: t.about.statUsers, label: t.about.statUsersLabel },
    { value: t.about.statOrders, label: t.about.statOrdersLabel },
  ];

  const PROMISES = [
    { icon: '🚚', title: t.about.promiseShipTitle, desc: t.about.promiseShipDesc },
    { icon: '🔄', title: t.about.promiseReturnTitle, desc: t.about.promiseReturnDesc },
    { icon: '🎧', title: t.about.promiseServiceTitle, desc: t.about.promiseServiceDesc },
    { icon: '🛡️', title: t.about.promiseGenuineTitle, desc: t.about.promiseGenuineDesc },
  ];

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
        {/* Hero */}
        <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 text-white">
          <div className="max-w-shell mx-auto px-5 py-16 md:py-24">
            <div className="text-[12.5px] tracking-[2px] uppercase font-bold text-white/80 mb-3">
              {t.about.heroEyebrow}
            </div>
            <h1 className="text-[40px] md:text-[56px] font-extrabold leading-tight tracking-tight mb-5 max-w-3xl">
              {t.about.heroLead}
            </h1>
            <p className="text-[16px] md:text-[17.5px] leading-relaxed text-white/90 max-w-2xl">
              {t.about.heroBody}
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-shell mx-auto px-5 py-16">
          <div className="max-w-3xl">
            <h2 className="text-[28px] md:text-[34px] font-extrabold text-ink-900 leading-tight mb-4">
              {t.about.missionTitle}
            </h2>
            <p className="text-[16px] md:text-[18px] text-ink-700 leading-relaxed">
              {t.about.missionBody}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-ink-50 border-y border-ink-100">
          <div className="max-w-shell mx-auto px-5 py-12 md:py-16">
            <h2 className="text-[13px] tracking-[2px] uppercase font-bold text-ink-500 mb-8 text-center">
              {t.about.statsTitle}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[36px] md:text-[44px] font-extrabold text-orange-700 leading-none mb-2">
                    {s.value}
                  </div>
                  <div className="text-[13px] text-ink-600 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Four guarantees */}
        <section className="max-w-shell mx-auto px-5 py-16">
          <h2 className="text-[28px] md:text-[34px] font-extrabold text-ink-900 leading-tight mb-8 text-center">
            {t.about.promiseTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROMISES.map((p) => (
              <div
                key={p.title}
                className="bg-white rounded-2xl p-6 border border-ink-100 hover:shadow-float hover:-translate-y-1 transition-all"
              >
                <div className="text-[40px] mb-3" aria-hidden="true">{p.icon}</div>
                <h3 className="text-[16px] font-bold text-ink-900 mb-2">{p.title}</h3>
                <p className="text-[13px] text-ink-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="bg-ink-50 border-y border-ink-100">
          <div className="max-w-shell mx-auto px-5 py-16">
            <div className="max-w-3xl">
              <div className="text-[12.5px] tracking-[2px] uppercase font-bold text-ink-500 mb-3">
                {t.about.teamTitle}
              </div>
              <h2 className="text-[28px] md:text-[34px] font-extrabold text-ink-900 leading-tight mb-4">
                {t.about.teamLead}
              </h2>
              <p className="text-[15px] md:text-[16.5px] text-ink-700 leading-relaxed">
                {t.about.teamBody}
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-shell mx-auto px-5 py-16">
          <div className="bg-white rounded-2xl border border-ink-100 p-8 md:p-12 text-center">
            <h2 className="text-[24px] md:text-[30px] font-extrabold text-ink-900 mb-3">
              {t.about.ctaTitle}
            </h2>
            <p className="text-[14.5px] text-ink-600 mb-6 max-w-xl mx-auto leading-relaxed">
              {t.about.ctaBody}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-7 py-3 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-bold rounded-md transition-colors"
            >
              {t.about.ctaButton}
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}