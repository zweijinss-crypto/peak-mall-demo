'use client';

import { useMemo, useState } from 'react';
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
  /** ISO string — static to avoid hydration mismatch */
  date: string;
  note: string;
}

const FLOW_SEED: Flow[] = [
  { id: 'F1', type: 'in',       amount:  42.50, date: '2026-09-19T03:12:00.000Z', note: '订单 ORD-7841 佣金' },
  { id: 'F2', type: 'in',       amount:  18.00, date: '2026-09-15T07:42:00.000Z', note: '订单 ORD-7815 佣金' },
  { id: 'F3', type: 'frozen',   amount:  12.30, date: '2026-09-11T11:24:00.000Z', note: '提现申请 W-223 冻结' },
  { id: 'F4', type: 'out',      amount: 100.00, date: '2026-09-08T09:05:00.000Z', note: '提现成功 W-198' },
  { id: 'F5', type: 'in',       amount:  54.10, date: '2026-09-05T15:30:00.000Z', note: '订单 ORD-7754 佣金' },
  { id: 'F6', type: 'unfreeze', amount:  12.30, date: '2026-09-01T10:00:00.000Z', note: '提现申请 W-223 解冻' },
  { id: 'F7', type: 'in',       amount:  31.20, date: '2026-08-22T10:00:00.000Z', note: '订单 ORD-7700 佣金' },
  { id: 'F8', type: 'out',      amount:  50.00, date: '2026-08-15T10:00:00.000Z', note: '提现成功 W-180' },
  { id: 'F9', type: 'frozen',   amount:   8.50, date: '2026-08-10T10:00:00.000Z', note: '提现申请 W-185 冻结' },
];

const FLOW_LABEL: Record<FlowKind, { zh: string; en: string; ja: string; ko: string; cls: string }> = {
  in:       { zh: '入账', en: 'Credit',    ja: '入金', ko: '입금', cls: 'bg-emerald-100 text-emerald-700' },
  out:      { zh: '出账', en: 'Debit',     ja: '出金', ko: '출금', cls: 'bg-rose-100 text-rose-700' },
  frozen:   { zh: '冻结', en: 'Frozen',    ja: '凍結', ko: '동결', cls: 'bg-amber-100 text-amber-700' },
  unfreeze: { zh: '解冻', en: 'Released',  ja: '解除', ko: '해제', cls: 'bg-blue-100 text-blue-700' },
};

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FundsPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('funds');

  const [month, setMonth] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [exportToast, setExportToast] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set<string>();
    FLOW_SEED.forEach((f) => set.add(f.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, []);

  const filtered = useMemo(() => {
    let arr = FLOW_SEED;
    if (month !== 'all') arr = arr.filter((f) => f.date.slice(0, 7) === month);
    if (kind !== 'all') arr = arr.filter((f) => f.type === kind);
    return arr;
  }, [month, kind]);

  const SUMMARY = [
    { label: t.funds.available,    value: '$248.90', accent: 'text-emerald-700' },
    { label: t.funds.frozen,       value: '$12.30',  accent: 'text-amber-700' },
    { label: t.funds.earnedTotal,  value: '$1,234.50', accent: 'text-orange-700' },
    { label: t.funds.withdrawnTotal, value: '$985.60', accent: 'text-blue-700' },
  ];

  const isEn = chrome.isEn;

  const handleExport = () => {
    const headers = ['ID', 'Type', 'Amount', 'Note', 'Date'];
    const body = filtered.map((f) => {
      const meta = FLOW_LABEL[f.type];
      const sign = f.type === 'in' || f.type === 'unfreeze' ? '+' : '-';
      return [
        f.id,
        isEn ? meta.en : meta.zh,
        `${sign}$${Math.abs(f.amount).toFixed(2)}`,
        f.note,
        f.date.slice(0, 10),
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`funds-${stamp}.csv`, [headers, ...body]);
    setExportToast(t.funds.exported(filtered.length));
    window.setTimeout(() => setExportToast(null), 2000);
  };

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

        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
            <span>{t.funds.monthLabel}</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label={t.funds.monthLabel}
              className="px-2.5 py-1.5 border border-ink-200 rounded-md text-[12.5px] outline-none focus:border-orange-500 bg-white"
            >
              <option value="all">{t.funds.monthAll}</option>
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
            <span>{t.funds.typeLabel}</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label={t.funds.typeLabel}
              className="px-2.5 py-1.5 border border-ink-200 rounded-md text-[12.5px] outline-none focus:border-orange-500 bg-white"
            >
              <option value="all">{t.funds.typeAll}</option>
              <option value="in">{t.funds.flowTypeIn}</option>
              <option value="out">{t.funds.flowTypeOut}</option>
              <option value="frozen">{t.funds.flowTypeFrozen}</option>
              <option value="unfreeze">{t.funds.flowTypeUnfreeze}</option>
            </select>
          </label>

          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="ml-auto px-3 py-1.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[12.5px] font-bold rounded transition-colors disabled:border-ink-200 disabled:text-ink-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            ⬇ {t.funds.export}
          </button>
        </div>

        {exportToast && (
          <div
            role="status"
            className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[13px]"
          >
            ✓ {exportToast}
          </div>
        )}

        {/* Recent flows */}
        <section className="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <h2 className="px-5 py-4 text-[15px] font-bold text-ink-900 border-b border-ink-100">
            {t.funds.recentFlows}
          </h2>
          {FLOW_SEED.length === 0 ? (
            <div className="px-5 py-16 text-center text-[13px] text-ink-500">
              {t.funds.flowEmpty}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center text-[13px] text-ink-500">
              {t.funds.noMatch}
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
                  {filtered.map((f) => {
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
