'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserShell, PageBanner } from '@/components/peak-mall';
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

  /** G2: detail modal */
  const [detailId, setDetailId] = useState<string | null>(null);
  const ticket = detailId ? tickets.find((tk) => tk.id === detailId) ?? null : null;
  // 进度行: 根据状态映射哪几步已完成
  const stepDone = (s: Status, step: 0 | 1 | 2 | 3) => {
    if (s === 'pending') return step === 0; // submitted
    if (s === 'approved') return step <= 1;
    if (s === 'completed' || s === 'refunded') return true;
    if (s === 'rejected') return step <= 1; // submitted + review, stopped at step 2
    return false;
  };

  const statusCounts = tickets.reduce<Record<Status, number>>(
    (acc, tk) => { acc[tk.status] = (acc[tk.status] || 0) + 1; return acc; },
    { pending: 0, approved: 0, rejected: 0, completed: 0, refunded: 0 },
  );

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
        <PageBanner
          title={t.aftersale.title}
          subtitle={chrome.isEn ? 'Submit and track after-sales requests' : '提交与追踪售后申请'}
          stats={[
            { label: chrome.isEn ? 'Total' : '总单数', value: tickets.length, tone: 'accent' as const },
            { label: t.aftersale.statusPending, value: statusCounts.pending },
            { label: t.aftersale.statusApproved, value: statusCounts.approved },
            { label: t.aftersale.statusRefunded, value: statusCounts.refunded },
          ]}
          trailing={
            <button
              onClick={() => setRequestOpen(true)}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors flex-shrink-0"
            >
              + {t.aftersale.requestBtn}
            </button>
          }
        />

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
                {t.address.cancel as string}
              </button>
            </div>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
            <div className="text-[40px] mb-3">🛠️</div>
            <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.aftersale.empty}</div>
            <div className="text-[12px] text-ink-500">{t.aftersale.emptyDesc}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((tk) => (
              // Use <div role="button"> rather than <article role="button">:
              // ARIA disallows the button role on <article> per WAI-ARIA 1.2.
              // Also include the visible text in the aria-label so screen
              // readers don't read it as "After-sales details AS_1001" only.
              <div
                key={tk.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailId(tk.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailId(tk.id);
                  }
                }}
                // aria-labelledby (rather than aria-label) so the visible header
                // text is the accessible name — satisfies LH a11y audit
                // label-content-name-mismatch without losing the identifier.
                aria-labelledby={`ticket-${tk.id}-label`}
                className="bg-white rounded-xl border border-ink-100 overflow-hidden cursor-pointer hover:border-orange-300 transition-colors"
              >
                <header
                  id={`ticket-${tk.id}-label`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 bg-ink-50 border-b border-ink-100 text-[12.5px]"
                >
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
                <footer className="flex flex-wrap justify-end items-center gap-3 px-5 py-3.5 bg-ink-50 border-t border-ink-100">
                  {/* min-h-[28px] ensures 24x24 tap area after text padding. */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/orders');
                    }}
                    className="min-h-[28px] text-[12.5px] font-semibold text-ink-600 hover:text-ink-900"
                  >
                    {t.aftersale.viewOrder} →
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailId(tk.id);
                    }}
                    aria-expanded={detailId === tk.id}
                    className="min-h-[28px] text-[12.5px] font-semibold text-orange-700 hover:text-orange-800"
                  >
                    {t.aftersale.detailTitle} →
                  </button>
                </footer>
              </div>
            ))}
          </div>
        )}
      </UserShell>

      {/* G2: detail modal */}
      {ticket && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.aftersale.detailTitle}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4"
          onClick={() => setDetailId(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ink-100 sticky top-0 bg-white">
              <div>
                <div className="text-[11px] tracking-[1.5px] uppercase text-ink-500 font-bold">
                  {t.aftersale.detailTitle}
                </div>
                <div className="font-mono font-semibold text-ink-900 text-[15px] mt-0.5">{ticket.id}</div>
              </div>
              <button
                onClick={() => setDetailId(null)}
                aria-label={t.aftersale.closeBtn}
                className="w-9 h-9 rounded-md hover:bg-ink-50 text-ink-500 hover:text-ink-900 flex items-center justify-center text-[20px] leading-none"
              >
                ×
              </button>
            </header>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="bg-ink-50 rounded-md p-3">
                  <div className="text-[11px] tracking-[1.2px] uppercase text-ink-500 font-bold mb-1">
                    {t.aftersale.orderId}
                  </div>
                  <div className="font-mono font-semibold text-ink-900">{ticket.orderId}</div>
                </div>
                <div className="bg-ink-50 rounded-md p-3">
                  <div className="text-[11px] tracking-[1.2px] uppercase text-ink-500 font-bold mb-1">
                    {t.aftersale.statusRefunded}
                  </div>
                  <div className={`inline-block px-2 py-0.5 rounded-full text-[11.5px] font-bold ${STATUS_COLOR[ticket.status]}`}>
                    {STATUS_LABEL[ticket.status]}
                  </div>
                </div>
              </div>

              <section className="bg-white border border-ink-100 rounded-md p-4">
                <div className="text-[11px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-3">
                  {t.aftersale.timelineTitle}
                </div>
                <ol className="space-y-2.5">
                  <TimelineStep done={stepDone(ticket.status, 0)} label={t.aftersale.stepSubmitted} time={ticket.createdAt} />
                  <TimelineStep done={stepDone(ticket.status, 1)} label={t.aftersale.stepReviewing} />
                  <TimelineStep done={stepDone(ticket.status, 2)} label={t.aftersale.stepApproved} danger={ticket.status === 'rejected'} />
                  <TimelineStep done={stepDone(ticket.status, 3)} label={t.aftersale.stepDone} />
                </ol>
              </section>

              <section className="bg-white border border-ink-100 rounded-md p-4 space-y-2 text-[13px]">
                <div>
                  <span className="text-ink-500">{t.aftersale.reason}: </span>
                  <b className="text-ink-900">{ticket.reason}</b>
                </div>
                <div className="text-[11.5px] text-ink-500" suppressHydrationWarning>
                  {t.aftersale.createdAt}: {mounted ? new Date(ticket.createdAt).toLocaleString() : ''}
                </div>
                <div className="text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mt-2">
                  ⏱ {t.aftersale.expectTime}
                </div>
              </section>

              {(ticket.status === 'refunded' || ticket.status === 'completed') && (
                <section className="bg-emerald-50 border border-emerald-200 rounded-md p-4 space-y-1.5 text-[13px]">
                  <div className="text-[11px] tracking-[1.5px] uppercase text-emerald-700 font-bold">
                    {t.aftersale.refundAmount}
                  </div>
                  <div className="text-emerald-900 font-bold text-[18px]">${(49.99).toFixed(2)}</div>
                  <div className="text-emerald-800 text-[12px]">
                    {t.aftersale.refundMethod}: {t.aftersale.refundToOrigin}
                  </div>
                </section>
              )}
            </div>

            <footer className="flex flex-wrap justify-end items-center gap-3 px-5 py-4 bg-ink-50 border-t border-ink-100">
              <button
                onClick={() => router.push('/orders')}
                className="px-4 py-2 border border-ink-200 hover:border-ink-300 text-ink-700 text-[13px] font-bold rounded-md transition-colors"
              >
                {t.aftersale.viewOrder}
              </button>
              <button
                onClick={() => setDetailId(null)}
                className="px-5 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors"
              >
                {t.aftersale.closeBtn}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

/** G2: timeline step row */
function TimelineStep({ done, label, time, danger }: { done: boolean; label: string; time?: number; danger?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dot = danger ? 'bg-rose-500' : done ? 'bg-emerald-500' : 'bg-ink-200';
  const text = done ? 'text-ink-900' : 'text-ink-400';
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold ${text}`}>{label}</div>
        {time !== undefined && done && (
          <div className="text-[11px] text-ink-500 mt-0.5" suppressHydrationWarning>
            {mounted ? new Date(time).toLocaleString() : ''}
          </div>
        )}
      </div>
    </li>
  );
}