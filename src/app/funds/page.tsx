'use client';

import { useRouter } from 'next/navigation';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  PageBanner,
} from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

type FlowKind = 'in' | 'out' | 'frozen' | 'unfreeze';

interface Flow {
  id: string;
  type: FlowKind;
  amount: number;
  date: string; // ISO — static to avoid hydration mismatch
  note: string;
}

const FLOW_SEED: Flow[] = [
  { id: 'F1', type: 'in',      amount:  42.50, date: '2026-09-19T03:12:00.000Z', note: '订单 ORD-7841 佣金' },
  { id: 'F2', type: 'in',      amount:  18.00, date: '2026-09-15T07:42:00.000Z', note: '订单 ORD-7815 佣金' },
  { id: 'F3', type: 'frozen',  amount:  12.30, date: '2026-09-11T11:24:00.000Z', note: '提现申请 W-223 冻结' },
  { id: 'F4', type: 'out',     amount: 100.00, date: '2026-09-08T09:05:00.000Z', note: '提现成功 W-198' },
  { id: 'F5', type: 'in',      amount:  54.10, date: '2026-09-05T15:30:00.000Z', note: '订单 ORD-7754 佣金' },
  { id: 'F6', type: 'unfreeze',amount:  12.30, date: '2026-09-01T10:00:00.000Z', note: '提现申请 W-223 解冻' },
];

const FLOW_LABEL: Record<FlowKind, { zh: string; en: string; cls: string }> = {
  in:       { zh: '入账',  en: 'Credit',    cls: 'bg-emerald-100 text-emerald-700' },
  out:      { zh: '出账',  en: 'Debit',     cls: 'bg-rose-100 text-rose-700' },
  frozen:   { zh: '冻结',  en: 'Frozen',    cls: 'bg-amber-100 text-amber-700' },
  unfreeze: { zh: '解冻',  en: 'Released',  cls: 'bg-blue-100 text-blue-700' },
};

export default function FundsPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('funds');

  const SUMMARY = [
    { label: t.funds.available,    value: '$248.90', accent: 'text-emerald-700' },
    { label: t.funds.frozen,       value: '$12.30',  accent: 'text-amber-700' },
    { label: t.funds.earnedTotal,  value: '$1,234.50', accent: 'text-orange-700' },
    { label: t.funds.withdrawnTotal, value: '$985.60', accent: 'text-blue-700' },
  ];

  const isEn = chrome.isEn;

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

      <main className="max-w-shell mx-auto px-5 py-8">
        <PageBanner
          title={t.funds.title}
          subtitle={t.funds.subtitle}
          stats={[
            { label: t.funds.available, value: '$248.90', tone: 'accent' as const },
            { label: t.funds.frozen, value: '$12.30' },
            { label: t.funds.earnedTotal, value: '$1,234.50' },
            { label: t.funds.withdrawnTotal, value: '$985.60' },
          ]}
          trailing={
            <button
              onClick={() => router.push('/withdraw')}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors flex-shrink-0"
            >
              {t.funds.withdrawNow}
            </button>
          }
        />

        {/* Recent flows */}
        <section className="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <h2 className="px-5 py-4 text-[15px] font-bold text-ink-900 border-b border-ink-100">
            {t.funds.recentFlows}
          </h2>
          {FLOW_SEED.length === 0 ? (
            <div className="px-5 py-16 text-center text-[13px] text-ink-500">
              {t.funds.flowEmpty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead className="bg-ink-50 text-ink-600 text-[12px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">ID</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-left">Note</th>
                    <th className="px-5 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {FLOW_SEED.map((f) => {
                    const meta = FLOW_LABEL[f.type];
                    const sign = f.type === 'in' || f.type === 'unfreeze' ? '+' : '−';
                    return (
                      <tr key={f.id} className="border-t border-ink-100">
                        <td className="px-5 py-3 text-ink-500 font-mono text-[12.5px]">{f.id}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11.5px] font-bold ${meta.cls}`}>
                            {isEn ? meta.en : meta.zh}
                          </span>
                        </td>
                        <td className={`px-5 py-3 text-right font-bold tabular-nums ${sign === '+' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {sign}${Math.abs(f.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-ink-700">{f.note}</td>
                        <td className="px-5 py-3 text-ink-500 text-[12.5px]">
                          {new Date(f.date).toISOString().slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}