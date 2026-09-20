'use client';

import { UserShell } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

interface CommissionRow {
  id: string;
  order: string;
  source: string;
  amount: number;
  rate: string;
  status: 'settled' | 'pending';
  date: string; // ISO string — static to avoid hydration mismatch
}

const ROWS: CommissionRow[] = [
  { id: 'C1', order: 'ORD-7841', source: 'Direct',  amount: 4.50, rate: '5%',  status: 'settled', date: '2024-09-19T03:12:00.000Z' },
  { id: 'C2', order: 'ORD-7815', source: 'Level 1', amount: 2.10, rate: '3%',  status: 'settled', date: '2024-09-15T07:42:00.000Z' },
  { id: 'C3', order: 'ORD-7798', source: 'Level 2', amount: 1.35, rate: '1.5%',status: 'pending', date: '2024-09-11T11:24:00.000Z' },
  { id: 'C4', order: 'ORD-7780', source: 'Direct',  amount: 7.20, rate: '5%',  status: 'settled', date: '2024-09-08T09:05:00.000Z' },
  { id: 'C5', order: 'ORD-7754', source: 'Level 1', amount: 0.95, rate: '3%',  status: 'pending', date: '2024-09-05T15:30:00.000Z' },
  { id: 'C6', order: 'ORD-7721', source: 'Direct',  amount: 5.40, rate: '5%',  status: 'settled', date: '2024-09-01T10:00:00.000Z' },
];

export default function CommissionsPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const chrome = usePageChrome('commissions');

  const total = ROWS.reduce((s, r) => s + r.amount, 0);
  const thisMonth = ROWS.filter((r) => r.date.startsWith('2024-09')).reduce((s, r) => s + r.amount, 0);
  const pending = ROWS.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const settled = ROWS.filter((r) => r.status === 'settled').reduce((s, r) => s + r.amount, 0);

  return (
    <>

      <UserShell>
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{t.commissions.title}</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card label={t.commissions.totalEarned} value={`$${total.toFixed(2)}`} color="text-orange-700" />
          <Card label={t.commissions.thisMonth} value={`$${thisMonth.toFixed(2)}`} color="text-emerald-700" />
          <Card label={t.commissions.pending} value={`$${pending.toFixed(2)}`} color="text-amber-700" />
          <Card label={t.commissions.available} value={`$${settled.toFixed(2)}`} color="text-primary" />
        </div>

        {ROWS.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
            <div className="text-[64px] mb-4">💰</div>
            <div className="text-[18px] font-bold text-ink-900 mb-2">{t.commissions.empty}</div>
            <div className="text-[13.5px] text-ink-500">{t.commissions.emptyDesc}</div>
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
                {ROWS.map((r) => (
                  <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50">
                    <td className="px-4 py-3 font-mono text-ink-900">{r.order}</td>
                    <td className="px-4 py-3 text-ink-700">{r.source}</td>
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
      </UserShell>

    </>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-5">
      <div className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-1">{label}</div>
      <div className={`text-[24px] font-extrabold ${color}`}>{value}</div>
    </div>
  );
}