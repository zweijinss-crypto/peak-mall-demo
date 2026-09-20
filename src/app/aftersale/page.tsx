'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserShell } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import { usePeakStore, type Order } from '@/lib/store';

type Status = 'pending' | 'approved' | 'rejected' | 'completed' | 'refunded';

interface AfterSaleTicket {
  id: string;
  orderId: string;
  reason: string;
  note?: string;
  status: Status;
  createdAt: number;
}

const SEED: AfterSaleTicket[] = [
  { id: 'AS_1001', orderId: 'ORD-7841', reason: 'Wrong color', status: 'pending', createdAt: 1726800000000 },
  { id: 'AS_1002', orderId: 'ORD-7815', reason: 'Damaged on arrival', status: 'approved', createdAt: 1725840000000 },
  { id: 'AS_1003', orderId: 'ORD-7798', reason: 'Wrong size', status: 'refunded', createdAt: 1725321600000 },
];

export default function AftersalePage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const router = useRouter();
  const chrome = usePageChrome('aftersale');
  const orders = usePeakStore((s) => s.orders);
  const [tickets] = useState<AfterSaleTicket[]>(SEED);
  const [requestOpen, setRequestOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const STATUS_COLOR: Record<Status, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-rose-100 text-rose-700',
    completed: 'bg-emerald-100 text-emerald-700',
    refunded: 'bg-violet-100 text-violet-700',
  };
  const STATUS_LABEL: Record<Status, string> = {
    pending: t.aftersale.statusPending,
    approved: t.aftersale.statusApproved,
    rejected: t.aftersale.statusRejected,
    completed: t.aftersale.statusCompleted,
    refunded: t.aftersale.statusRefunded,
  };

  const submit = () => {
    if (!orderId || !reason) return;
    // Demo: just show success banner. Real impl would POST /api/aftersale.
    setSubmitted(true);
    setRequestOpen(false);
    setOrderId('');
    setReason('');
    setNote('');
    setTimeout(() => setSubmitted(false), 2400);
  };

  return (
    <>

      <UserShell>
        <div className="flex items-end justify-between mb-6">
          <h1 className="text-[28px] font-extrabold text-ink-900">{t.aftersale.title}</h1>
          <button
            onClick={() => setRequestOpen(true)}
            className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors"
          >
            + {t.aftersale.requestBtn}
          </button>
        </div>

        {submitted && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[13px]">
            ✓ {t.aftersale.submitOk}
          </div>
        )}

        {requestOpen && (
          <div className="bg-white rounded-xl border border-ink-100 p-6 mb-6 max-w-[640px]">
            <h2 className="text-[18px] font-bold text-ink-900 mb-4">{t.aftersale.requestBtn}</h2>
            <label className="block mb-3">
              <span className="block text-[13px] text-ink-600 mb-1.5">{t.aftersale.orderId} *</span>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                aria-label={t.aftersale.orderId}
              >
                <option value="">—</option>
                {(orders as Order[]).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block mb-3">
              <span className="block text-[13px] text-ink-600 mb-1.5">{t.aftersale.reason} *</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="Damaged on arrival"
              />
            </label>
            <label className="block mb-5">
              <span className="block text-[13px] text-ink-600 mb-1.5">{t.aftersale.note}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={submit}
                disabled={!orderId || !reason}
                className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[13.5px] font-bold rounded-md transition-colors"
              >
                {t.aftersale.submitOk}
              </button>
              <button
                onClick={() => setRequestOpen(false)}
                className="px-5 py-2.5 bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[13.5px] font-bold rounded-md transition-colors"
              >
                {cp.address.cancel as string}
              </button>
            </div>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
            <div className="text-[64px] mb-4">🛠️</div>
            <div className="text-[18px] font-bold text-ink-900 mb-2">{t.aftersale.empty}</div>
            <div className="text-[13.5px] text-ink-500">{t.aftersale.emptyDesc}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((tk) => (
              <article
                key={tk.id}
                className="bg-white rounded-xl border border-ink-100 overflow-hidden"
              >
                <header className="flex flex-wrap items-center gap-3 px-5 py-3 bg-ink-50 border-b border-ink-100 text-[12.5px]">
                  <span className="font-mono font-semibold text-ink-900">{tk.id}</span>
                  <span className="text-ink-500">
                    {t.aftersale.orderId}: <b className="text-ink-900">{tk.orderId}</b>
                  </span>
                  <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${STATUS_COLOR[tk.status]}`}>
                    {STATUS_LABEL[tk.status]}
                  </span>
                </header>
                <div className="p-5">
                  <div className="text-[14px] text-ink-700">
                    {t.aftersale.reason}: <b className="text-ink-900">{tk.reason}</b>
                  </div>
                  <div className="mt-3 text-[12.5px] text-ink-500" suppressHydrationWarning>
                    {mounted ? new Date(tk.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                <footer className="flex justify-end px-5 py-3.5 bg-ink-50 border-t border-ink-100">
                  <button
                    onClick={() => router.push('/orders')}
                    className="text-[12.5px] font-semibold text-orange-700 hover:text-orange-800"
                  >
                    {t.aftersale.viewOrder} →
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </UserShell>

    </>
  );
}