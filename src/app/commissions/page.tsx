'use client';

import { useMemo, useState } from 'react';
import { UserShell, PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

interface CommissionRow {
  id: string;
  order: string;
  source: 'Direct' | 'Level 1' | 'Level 2';
  amount: number;
  rate: string;
  status: 'settled' | 'pending';
  /** ISO date string — static seed avoids hydration mismatch */
  date: string;
  /** B7: detail modal extra fields */
  productName: string;
  orderAmount: number;
  referredBy: string;
}

const ROWS: CommissionRow[] = [
  { id: 'C1', order: 'ORD-7841', source: 'Direct',  amount: 4.50, rate: '5%',  status: 'settled', date: '2024-09-19T03:12:00.000Z', productName: 'Ultra-Slim Business Laptop', orderAmount: 90.00,  referredBy: 'Diana Chen' },
  { id: 'C2', order: 'ORD-7815', source: 'Level 1', amount: 2.10, rate: '3%',  status: 'settled', date: '2024-09-15T07:42:00.000Z', productName: 'Magnetic Cable Organizer',   orderAmount: 70.00,  referredBy: 'Mike Liu' },
  { id: 'C3', order: 'ORD-7798', source: 'Level 2', amount: 1.35, rate: '1.5%',status: 'pending', date: '2024-09-11T11:24:00.000Z', productName: 'Foldable Camera Drone',       orderAmount: 90.00,  referredBy: 'Sara Wang' },
  { id: 'C4', order: 'ORD-7780', source: 'Direct',  amount: 7.20, rate: '5%',  status: 'settled', date: '2024-09-08T09:05:00.000Z', productName: '4K Action Camera',            orderAmount: 144.00, referredBy: 'Diana Chen' },
  { id: 'C5', order: 'ORD-7754', source: 'Level 1', amount: 0.95, rate: '3%',  status: 'pending', date: '2024-09-05T15:30:00.000Z', productName: 'Smart Fitness Band',          orderAmount: 31.67,  referredBy: 'Tom Zhao' },
  { id: 'C6', order: 'ORD-7721', source: 'Direct',  amount: 5.40, rate: '5%',  status: 'settled', date: '2024-09-01T10:00:00.000Z', productName: 'Bluetooth Selfie Stick',      orderAmount: 108.00, referredBy: 'Diana Chen' },
  { id: 'C7', order: 'ORD-7700', source: 'Direct',  amount: 3.10, rate: '5%',  status: 'settled', date: '2024-08-25T10:00:00.000Z', productName: 'Mini Bluetooth Speaker',      orderAmount: 62.00,  referredBy: 'Diana Chen' },
  { id: 'C8', order: 'ORD-7680', source: 'Level 2', amount: 0.85, rate: '1.5%',status: 'settled', date: '2024-08-10T10:00:00.000Z', productName: 'Portable USB Mini Fan',       orderAmount: 56.67,  referredBy: 'Sara Wang' },
];

type StatusTab = 'all' | CommissionRow['status'];

/**
 * CSV escape — wrap in quotes when the value contains a comma, quote, or newline.
 * Inner quotes are doubled.
 */
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

export default function CommissionsPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const chrome = usePageChrome('commissions');

  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [month, setMonth] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [exportToast, setExportToast] = useState<string | null>(null);

  /** B7: detail modal — selectedId = 当前打开的佣金 id, null = 关闭 */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? ROWS.find((r) => r.id === selectedId) ?? null : null;

  const months = useMemo(() => {
    const set = new Set<string>();
    ROWS.forEach((r) => set.add(r.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, []);

  const filtered = useMemo(() => {
    let arr = ROWS;
    if (statusTab !== 'all') arr = arr.filter((r) => r.status === statusTab);
    if (month !== 'all') arr = arr.filter((r) => r.date.slice(0, 7) === month);
    if (source !== 'all') arr = arr.filter((r) => r.source === source);
    return arr;
  }, [statusTab, month, source]);

  const total = ROWS.reduce((s, r) => s + r.amount, 0);
  const thisMonth = ROWS.filter((r) => r.date.startsWith('2024-09')).reduce((s, r) => s + r.amount, 0);
  const pending = ROWS.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const settled = ROWS.filter((r) => r.status === 'settled').reduce((s, r) => s + r.amount, 0);

  const statusCounts = {
    all: ROWS.length,
    settled: ROWS.filter((r) => r.status === 'settled').length,
    pending: ROWS.filter((r) => r.status === 'pending').length,
  };

  const SOURCE_LABEL: Record<CommissionRow['source'], string> = {
    'Direct': t.commissions.sourceDirect,
    'Level 1': t.commissions.sourceLevel1,
    'Level 2': t.commissions.sourceLevel2,
  };

  const handleExport = () => {
    const headers = [t.commissions.order, t.commissions.source, t.commissions.rate, t.commissions.amount, t.commissions.date, 'status'];
    const body = filtered.map((r) => [
      r.order,
      SOURCE_LABEL[r.source],
      r.rate,
      `$${r.amount.toFixed(2)}`,
      r.date.slice(0, 10),
      r.status === 'settled' ? t.commissions.statusSettled : t.commissions.statusPending,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`commissions-${stamp}.csv`, [headers, ...body]);
    setExportToast(t.commissions.exported(filtered.length));
    window.setTimeout(() => setExportToast(null), 2000);
  };

  /** B8: 单笔佣金导出 — 只导当前打开的 modal 对应那一行 */
  const handleExportRow = (row: CommissionRow) => {
    const headers = [t.commissions.order, t.commissions.source, t.commissions.rate, t.commissions.amount, t.commissions.date, 'status'];
    const body = [[
      row.order,
      SOURCE_LABEL[row.source],
      row.rate,
      `$${row.amount.toFixed(2)}`,
      row.date.slice(0, 10),
      row.status === 'settled' ? t.commissions.statusSettled : t.commissions.statusPending,
    ]];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`commission-${row.order}-${stamp}.csv`, [headers, ...body]);
    setExportToast(t.commissions.rowExported);
    window.setTimeout(() => setExportToast(null), 2000);
  };

  return (
    <UserShell>
      <PageBanner
        title={t.commissions.title}
        subtitle={chrome.isEn ? 'Track direct and team commissions' : '追踪直推与团队佣金'}
        stats={[
          { label: t.commissions.totalEarned, value: `$${total.toFixed(2)}`, tone: 'accent' as const },
          { label: t.commissions.thisMonth, value: `$${thisMonth.toFixed(2)}` },
          { label: t.commissions.pending, value: `$${pending.toFixed(2)}` },
          { label: t.commissions.available, value: `$${settled.toFixed(2)}` },
        ]}
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex flex-wrap gap-1 bg-ink-50 border border-ink-100 p-1 rounded-md">
          {([
            { key: 'all', label: t.commissions.tabAll },
            { key: 'settled', label: t.commissions.tabSettled },
            { key: 'pending', label: t.commissions.tabPendingTab },
          ] as Array<{ key: StatusTab; label: string }>).map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 text-[12.5px] font-semibold rounded transition-colors flex items-center gap-1.5 ${
                  active ? 'bg-white text-orange-700 shadow-soft' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] tabular-nums ${active ? 'text-orange-700' : 'text-ink-500'}`}>
                  {statusCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
          <span>{t.commissions.monthLabel}</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label={t.commissions.monthLabel}
            className="px-2.5 py-1.5 border border-ink-200 rounded-md text-[12.5px] outline-none focus:border-orange-500 bg-white"
          >
            <option value="all">{t.commissions.monthAll}</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
          <span>{t.commissions.source}</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label={t.commissions.source}
            className="px-2.5 py-1.5 border border-ink-200 rounded-md text-[12.5px] outline-none focus:border-orange-500 bg-white"
          >
            <option value="all">{t.commissions.monthAll}</option>
            <option value="Direct">{t.commissions.sourceDirect}</option>
            <option value="Level 1">{t.commissions.sourceLevel1}</option>
            <option value="Level 2">{t.commissions.sourceLevel2}</option>
          </select>
        </label>

        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="ml-auto px-3 py-1.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[12.5px] font-bold rounded transition-colors disabled:border-ink-200 disabled:text-ink-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          ⬇ {t.commissions.export}
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

      {ROWS.length === 0 ? (
        <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
          <div className="text-[40px] mb-3">💰</div>
          <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.commissions.empty}</div>
          <div className="text-[12px] text-ink-500">{t.commissions.emptyDesc}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
          <div className="text-[40px] mb-3">🔎</div>
          <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.commissions.noMatch}</div>
          <div className="text-[12px] text-ink-500">{t.commissions.noMatchDesc}</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ink-100 overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead className="bg-ink-50 text-ink-600 text-[12px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-bold">{t.commissions.order}</th>
                <th className="text-left px-4 py-3 font-bold">{t.commissions.source}</th>
                <th className="text-right px-4 py-3 font-bold">{t.commissions.rate}</th>
                <th className="text-right px-4 py-3 font-bold">{t.commissions.amount}</th>
                <th className="text-left px-4 py-3 font-bold">{t.commissions.date}</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="border-t border-ink-100 hover:bg-ink-50 cursor-pointer focus:outline-none focus-visible:bg-orange-50"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(r.id);
                    }
                  }}
                  aria-label={`${r.order} — ${SOURCE_LABEL[r.source]} — $${r.amount.toFixed(2)}`}
                >
                  <td className="px-4 py-3 font-mono text-ink-900">{r.order}</td>
                  <td className="px-4 py-3 text-ink-700">{SOURCE_LABEL[r.source]}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{r.rate}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-700">${r.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-ink-500" suppressHydrationWarning>
                    {new Date(r.date).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${r.status === 'settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.status === 'settled' ? (cp.commissions.statusSettled as string) : (cp.commissions.statusPending as string)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* B7: detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="commissionDetailTitle"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-float">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-1">
                  {t.commissions.detailTitle}
                </div>
                <h3 id="commissionDetailTitle" className="text-[18px] font-extrabold text-ink-900 font-mono truncate">
                  {selected.order}
                </h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                aria-label={t.commissions.detailClose}
                className="w-8 h-8 flex-shrink-0 text-ink-400 hover:text-ink-700 hover:bg-ink-50 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>

            <div className={`inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full text-[11.5px] font-bold ${
              selected.status === 'settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {selected.status === 'settled' ? '✓' : '⏱'} {selected.status === 'settled' ? t.commissions.statusSettled : t.commissions.statusPending}
            </div>

            {/* 佣金明细 */}
            <div className="bg-ink-50 border border-ink-100 rounded-md p-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">{t.commissions.product}</span>
                <span className="text-ink-900 font-semibold text-right truncate ml-3">{selected.productName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">{t.commissions.orderAmount}</span>
                <span className="text-ink-900 font-semibold tabular-nums">${selected.orderAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">{t.commissions.commissionRate}</span>
                <span className="text-ink-900 font-semibold tabular-nums">{selected.rate}</span>
              </div>
              <div className="border-t border-ink-200 pt-2.5 flex justify-between gap-3">
                <span className="text-ink-700 font-bold">{t.commissions.commissionAmount}</span>
                <span className="text-orange-700 font-extrabold tabular-nums text-[15px]">${selected.amount.toFixed(2)}</span>
              </div>
              {selected.status === 'settled' && (
                <div className="flex justify-between gap-3 text-[11.5px]">
                  <span className="text-ink-500">{t.commissions.settledAt}</span>
                  <span className="text-ink-700 tabular-nums">{new Date(selected.date).toISOString().slice(0, 10)}</span>
                </div>
              )}
            </div>

            {/* 来源信息 */}
            <div className="mt-4">
              <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-2">
                {t.commissions.sourceInfo}
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="bg-white border border-ink-100 rounded-md p-3">
                  <div className="text-ink-500 mb-0.5">{t.commissions.referredBy}</div>
                  <div className="text-ink-900 font-bold truncate">{selected.referredBy}</div>
                </div>
                <div className="bg-white border border-ink-100 rounded-md p-3">
                  <div className="text-ink-500 mb-0.5">{t.commissions.tier}</div>
                  <div className="text-ink-900 font-bold">{SOURCE_LABEL[selected.source]}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setSelectedId(null)}
                className="flex-1 py-2.5 border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13.5px] font-bold rounded-md transition-colors"
              >
                {t.commissions.detailClose}
              </button>
              <button
                onClick={() => handleExportRow(selected)}
                className="flex-1 py-2.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[13.5px] font-bold rounded-md transition-colors"
              >
                ⬇ {t.commissions.exportRow}
              </button>
              <a
                href={`/orders/?order=${encodeURIComponent(selected.order)}`}
                className="flex-1 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13.5px] font-bold rounded-md transition-colors text-center"
              >
                {t.commissions.viewOrder} →
              </a>
            </div>
          </div>
        </div>
      )}
    </UserShell>
  );
}
