'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserShell } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

interface WithdrawAddr { id: string; label: string; type: string; isDefault: boolean; address: string }
interface WithdrawRow {
  id: string;
  amount: number;
  addressLabel: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string; // ISO — static
}

const HISTORY: WithdrawRow[] = [
  { id: 'W1', amount: 100, addressLabel: 'USDT-TRC20-default', status: 'completed', createdAt: '2024-09-15T03:12:00.000Z' },
  { id: 'W2', amount: 50,  addressLabel: 'USDT-TRC20-default', status: 'pending',   createdAt: '2024-09-19T07:42:00.000Z' },
  { id: 'W3', amount: 25,  addressLabel: 'Bank-ICBC',          status: 'rejected',  createdAt: '2024-09-08T11:24:00.000Z' },
];

const ADDR_KEY = 'peak_withdraw_addresses';

export default function WithdrawPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const router = useRouter();
  const chrome = usePageChrome('withdraw');
  const [addrs, setAddrs] = useState<WithdrawAddr[]>([]);
  const [amount, setAmount] = useState('');
  const [addrId, setAddrId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDR_KEY);
      const arr = raw ? (JSON.parse(raw) as WithdrawAddr[]) : [];
      setAddrs(arr);
      const def = arr.find((a) => a.isDefault);
      if (def) setAddrId(def.id);
    } catch { /* ignore */ }
  }, []);

  const available = 21.50;
  const pending = 50;
  const withdrawn = 100;

  const STATUS_COLOR: Record<WithdrawRow['status'], string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-rose-100 text-rose-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  const STATUS_LABEL: Record<WithdrawRow['status'], string> = {
    pending: t.withdraw.statusPending,
    approved: t.withdraw.statusApproved,
    rejected: t.withdraw.statusRejected,
    completed: t.withdraw.statusCompleted,
  };

  const submit = () => {
    const n = Number(amount);
    if (!n || n < 10 || !addrId) return;
    setSubmitted(true);
    setAmount('');
    setTimeout(() => setSubmitted(false), 2400);
  };

  return (
    <>

      <UserShell>
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{t.withdraw.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard label={t.withdraw.available} value={`$${available.toFixed(2)}`} color="text-emerald-700" />
          <SummaryCard label={t.withdraw.pending} value={`$${pending.toFixed(2)}`} color="text-amber-700" />
          <SummaryCard label={t.withdraw.withdrawn} value={`$${withdrawn.toFixed(2)}`} color="text-ink-700" />
        </div>

        {submitted && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[13px]">
            ✓ {t.withdraw.submitted}
          </div>
        )}

        <section className="bg-white rounded-xl border border-ink-100 p-6 mb-8 max-w-[640px]">
          <h2 className="text-[18px] font-bold text-ink-900 mb-4">{t.withdraw.apply}</h2>
          {addrs.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-[13px]">
              {t.withdraw.noAddress} <button onClick={() => router.push('/withdraw-address')} className="font-bold underline ml-1">{t.withdrawAddress.title}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdraw.amount} *</span>
                <input
                  type="number"
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="50"
                />
                <span className="block text-[11.5px] text-ink-500 mt-1">{t.withdraw.minAmount}</span>
              </label>
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdraw.selectAddress} *</span>
                <select
                  value={addrId}
                  onChange={(e) => setAddrId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                  aria-label={t.withdraw.selectAddress}
                >
                  <option value="">—</option>
                  {addrs.map((a) => (
                    <option key={a.id} value={a.id}>{a.label} ({a.address.slice(0, 8)}…)</option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <button
                  onClick={submit}
                  disabled={!addrId || Number(amount) < 10}
                  className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {t.withdraw.apply}
                </button>
              </div>
            </div>
          )}
        </section>

        <h2 className="text-[18px] font-bold text-ink-900 mb-3">{t.withdraw.history}</h2>
        {HISTORY.length === 0 ? (
          <div className="bg-white rounded-xl py-16 text-center border border-ink-100 text-ink-500 text-[13.5px]">
            {t.withdraw.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {HISTORY.map((r) => (
              <article key={r.id} className="bg-white rounded-xl border border-ink-100 px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="text-[20px] font-extrabold text-orange-700 min-w-[80px]">${r.amount.toFixed(2)}</div>
                <div className="flex-1 min-w-[160px]">
                  <div className="text-[13px] font-semibold text-ink-900">{r.addressLabel}</div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5" suppressHydrationWarning>
                    {new Date(r.createdAt).toISOString().slice(0, 10)}
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </article>
            ))}
          </div>
        )}
      </UserShell>

    </>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-5">
      <div className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-1">{label}</div>
      <div className={`text-[24px] font-extrabold ${color}`}>{value}</div>
    </div>
  );
}