'use client';
import { useState, useMemo } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';

import { PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { orderStatusLabel, usd, type OrderStatus } from '@/lib/admin/fixtures';

type Tab = 'all' | OrderStatus;

const STATUS_KIND: Record<OrderStatus, StatusKind> = {
  pending: 'pending',
  paid: 'paid',
  shipped: 'info',
  completed: 'active',
  cancelled: 'danger',
};

/**
 * OrdersClient — admin order lifecycle + bulk ops.
 *
 * Replaces the original flat table with:
 *   - Tabs (preserved from before)
 *   - Bulk-action bar (visible when rows are selected)
 *   - Per-row Detail button → 3-section modal:
 *       ① Order summary  ② Payment  ③ Shipping  ④ Timeline
 *   - Status-driven action buttons inside the modal:
 *       pending  → mark paid
 *       paid     → ship / refund
 *       shipped  → complete
 *       any      → cancel (with reason)
 *   - Cancel / refund / delete all go through confirm modals.
 */
export function OrdersClient() {
  const t = useT();
  const [orders, setOrders, mounted, isEn] = useAdminStore('orders');

  const [tab, setTab] = useState<Tab>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Modal state — one at a time.
  const [detailId, setDetailId] = useState<number | null>(null);
  const [cancellingIds, setCancellingIds] = useState<number[] | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<number[] | null>(null);

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter((o: any) => o.status === tab)),
    [orders, tab],
  );

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const locale = isEn ? 'en' : 'zh';
  const tabs: Array<[Tab, string]> = [
    ['all', t.admin.orders.tabs.all],
    ['pending', t.admin.orders.tabs.pending],
    ['paid', t.admin.orders.tabs.paid],
    ['shipped', t.admin.orders.tabs.shipped],
    ['completed', t.admin.orders.tabs.completed],
    ['cancelled', t.admin.orders.tabs.cancelled],
  ];

  // Selection helpers operate on filtered ids so the bulk bar doesn't
  // hide rows the user can't see in the current tab.
  const visibleIds = filtered.map((o: any) => o.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = visibleIds.some((id) => selected.has(id)) && !allSelected;

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };
  const clearSelection = () => setSelected(new Set());

  // Bulk ops — operate on whichever selected orders match the target status.
  // Mismatched ids are silently ignored.
  const bulkSetStatus = (target: OrderStatus) => {
    const ids = new Set(selected);
    setOrders(orders.map((o: any) => (ids.has(o.id) ? { ...o, status: target } : o)));
  };

  const detailOrder = detailId !== null ? orders.find((o: any) => o.id === detailId) ?? null : null;
  const refundingOrder = refundingId !== null ? orders.find((o: any) => o.id === refundingId) ?? null : null;

  const setStatus = (id: number, status: OrderStatus, extra: Record<string, any> = {}) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setOrders(
      orders.map((o: any) => (o.id === id ? { ...o, status, ...extra, updated_at: now } : o)),
    );
  };

  const requestCancel = (ids: number[]) => {
    setCancellingIds(ids);
    setCancelReason('');
  };
  const confirmCancel = () => {
    if (!cancellingIds) return;
    const ids = new Set(cancellingIds);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const reason = cancelReason.trim();
    setOrders(
      orders.map((o: any) =>
        ids.has(o.id)
          ? { ...o, status: 'cancelled' as const, cancel_reason: reason, updated_at: now }
          : o,
      ),
    );
    setCancellingIds(null);
    setCancelReason('');
    // Drop cancelled ids from selection so the bulk bar resets cleanly.
    setSelected((prev) => {
      const next = new Set(prev);
      cancellingIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const confirmRefund = () => {
    if (refundingId === null) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setOrders(
      orders.map((o: any) =>
        o.id === refundingId ? { ...o, status: 'cancelled' as const, refunded: true, refund_at: now, updated_at: now } : o,
      ),
    );
    setRefundingId(null);
  };

  const requestDelete = (ids: number[]) => setDeletingIds(ids);
  const confirmDelete = () => {
    if (!deletingIds) return;
    const idSet = new Set(deletingIds);
    setOrders(orders.filter((o: any) => !idSet.has(o.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      deletingIds.forEach((id) => next.delete(id));
      return next;
    });
    setDeletingIds(null);
  };

  return (
    <div>
      <PageBanner title={t.admin.orders.title} accent="emerald" />

      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3 border-b border-neutral-200 overflow-x-auto">
          {tabs.map(([k, n]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`pb-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${tab === k ? 'border-orange-600 text-orange-700' : 'border-transparent text-neutral-600 hover:text-neutral-900'}`}
            >
              {n}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-[12.5px] flex-wrap">
            <span className="font-bold text-orange-700">{t.admin.orders.bulkSelected(selected.size)}</span>
            <span className="text-orange-300">|</span>
            <button
              type="button"
              onClick={() => bulkSetStatus('shipped')}
              className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-700 transition-colors"
            >
              {t.admin.orders.bulkShip}
            </button>
            <button
              type="button"
              onClick={() => bulkSetStatus('completed')}
              className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-700 transition-colors"
            >
              {t.admin.orders.bulkComplete}
            </button>
            <button
              type="button"
              onClick={() => requestCancel(Array.from(selected))}
              className="px-2.5 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-white transition-colors"
            >
              {t.admin.orders.bulkCancel}
            </button>
            <button
              type="button"
              onClick={() => requestDelete(Array.from(selected))}
              className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
            >
              {t.admin.orders.delete}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 rounded text-neutral-600 hover:bg-white transition-colors"
            >
              {t.admin.orders.bulkClear}
            </button>
          </div>
        )}
      </div>

      <DataTable minWidth="900px">
        <thead>
          <tr>
            <Th className="w-[36px]">
              <input
                type="checkbox"
                aria-label={t.admin.orders.selectAll}
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="w-4 h-4 accent-orange-600 cursor-pointer"
              />
            </Th>
            <Th>{t.admin.orders.colOrder}</Th>
            <Th>{t.admin.orders.colUser}</Th>
            <Th>{t.admin.orders.colAmt}</Th>
            <Th>{t.admin.orders.colStatus}</Th>
            <Th>{t.admin.orders.colPay}</Th>
            <Th>{t.admin.orders.colCard}</Th>
            <Th>{t.admin.orders.colContact}</Th>
            <Th>{t.admin.orders.colAddr}</Th>
            <Th>{t.admin.orders.colTime}</Th>
            <Th>{t.admin.orders.colAction}</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <Td colSpan={11} className="text-center text-neutral-500 py-6">
                {t.admin.orders.empty}
              </Td>
            </tr>
          ) : (
            filtered.map((o: any) => (
              <tr
                key={o.id}
                className={`hover:bg-neutral-50 transition-colors ${selected.has(o.id) ? 'bg-orange-50/40' : ''}`}
              >
                <Td>
                  <input
                    type="checkbox"
                    aria-label={`${t.admin.orders.selectAll} ${o.order_no}`}
                    checked={selected.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                </Td>
                <Td className="font-mono text-[12px]">{o.order_no}</Td>
                <Td>
                  {o.nickname} <span className="text-neutral-500 text-[11px]">@{o.username}</span>
                </Td>
                <Td className="font-bold tabular-nums text-orange-700">{usd(o.amount)}</Td>
                <Td>
                  <StatusBadge kind={STATUS_KIND[o.status as OrderStatus]}>
                    {orderStatusLabel(o.status, locale as any)}
                  </StatusBadge>
                </Td>
                <Td className="text-[11.5px]">{o.pay_method || t.admin.orders.dash}</Td>
                <Td className="text-[11.5px]">
                  {o.card_last4
                    ? `${o.card_brand || ''} ****${o.card_last4}${o.card_expiry ? ` (${o.card_expiry})` : ''}`
                    : t.admin.orders.dash}
                </Td>
                <Td>{o.contact_name || t.admin.orders.dash}</Td>
                <Td muted className="max-w-[180px] truncate" title={o.address}>
                  {o.address || t.admin.orders.dash}
                </Td>
                <Td muted className="text-[11.5px]">{o.created_at}</Td>
                <Td className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setDetailId(o.id)}
                    className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {t.admin.orders.detail}
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Detail modal — 3 sections + status-driven actions */}
      <Modal
        open={detailId !== null}
        title={t.admin.orders.detailTitle}
        onClose={() => setDetailId(null)}
        width="600px"
      >
        {detailOrder && (
          <div>
            {/* Section ①: order summary */}
            <section className="bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[11px] text-neutral-500 uppercase tracking-wide">Order #</div>
                  <div className="font-mono text-[14px] font-bold text-neutral-900">{detailOrder.order_no}</div>
                </div>
                <StatusBadge kind={STATUS_KIND[detailOrder.status as OrderStatus]}>
                  {orderStatusLabel(detailOrder.status, locale as any)}
                </StatusBadge>
              </div>
              <dl className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[12.5px]">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.orders.colUser}</dt>
                  <dd className="font-semibold text-neutral-800">{detailOrder.nickname} <span className="text-neutral-500">@{detailOrder.username}</span></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.orders.colAmt}</dt>
                  <dd className="font-bold tabular-nums text-orange-700">{usd(detailOrder.amount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.orders.colTime}</dt>
                  <dd className="text-neutral-700">{detailOrder.created_at}</dd>
                </div>
                {detailOrder.updated_at && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Updated</dt>
                    <dd className="text-neutral-700">{detailOrder.updated_at}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Section ②: payment */}
            <section className="mb-4">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-neutral-500 mb-2">{t.admin.orders.paymentSection}</h3>
              {detailOrder.pay_method ? (
                <dl className="bg-white border border-neutral-200 rounded-md p-3 text-[12.5px] space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">{t.admin.orders.payMethod}</dt>
                    <dd className="font-semibold text-neutral-800 uppercase">{detailOrder.pay_method}</dd>
                  </div>
                  {detailOrder.card_brand && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">{t.admin.orders.cardBrand}</dt>
                      <dd className="font-semibold">{detailOrder.card_brand}</dd>
                    </div>
                  )}
                  {detailOrder.card_last4 && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">{t.admin.orders.cardLast4}</dt>
                      <dd className="font-mono">**** {detailOrder.card_last4}</dd>
                    </div>
                  )}
                  {detailOrder.card_expiry && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">{t.admin.orders.cardExpiry}</dt>
                      <dd className="font-mono">{detailOrder.card_expiry}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-[12px] text-amber-800">
                  {t.admin.orders.dash} — pending
                </div>
              )}
            </section>

            {/* Section ③: shipping */}
            <section className="mb-4">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-neutral-500 mb-2">{t.admin.orders.shippingSection}</h3>
              <dl className="bg-white border border-neutral-200 rounded-md p-3 text-[12.5px] space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.orders.colContact}</dt>
                  <dd className="font-semibold text-neutral-800">{detailOrder.contact_name || t.admin.orders.dash}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500 flex-shrink-0">{t.admin.orders.colAddr}</dt>
                  <dd className="text-neutral-800 text-right">{detailOrder.address || t.admin.orders.dash}</dd>
                </div>
              </dl>
            </section>

            {/* Section ④: timeline */}
            <section className="mb-4">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-neutral-500 mb-2">{t.admin.orders.timelineSection}</h3>
              <ol className="border-l-2 border-neutral-200 pl-4 space-y-2 text-[12.5px]">
                <li className="relative">
                  <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  <div className="font-semibold text-neutral-800">{t.admin.orders.evtCreated}</div>
                  <div className="text-[11px] text-neutral-500">{detailOrder.created_at}</div>
                </li>
                {detailOrder.status !== 'pending' && (
                  <li className="relative">
                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                    <div className="font-semibold text-neutral-800">
                      {detailOrder.refunded ? t.admin.orders.evtRefunded : t.admin.orders.evtPaid}
                    </div>
                    <div className="text-[11px] text-neutral-500">{detailOrder.updated_at || '—'}</div>
                  </li>
                )}
                {(detailOrder.status === 'shipped' || detailOrder.status === 'completed') && (
                  <li className="relative">
                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white" />
                    <div className="font-semibold text-neutral-800">{t.admin.orders.evtShipped}</div>
                    <div className="text-[11px] text-neutral-500">{detailOrder.updated_at || '—'}</div>
                  </li>
                )}
                {detailOrder.status === 'completed' && (
                  <li className="relative">
                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />
                    <div className="font-semibold text-neutral-800">{t.admin.orders.evtCompleted}</div>
                    <div className="text-[11px] text-neutral-500">{detailOrder.updated_at || '—'}</div>
                  </li>
                )}
                {detailOrder.status === 'cancelled' && (
                  <li className="relative">
                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white" />
                    <div className="font-semibold text-neutral-800">{t.admin.orders.evtCancelled}</div>
                    {detailOrder.cancel_reason && (
                      <div className="text-[11px] text-rose-600">{detailOrder.cancel_reason}</div>
                    )}
                    <div className="text-[11px] text-neutral-500">{detailOrder.updated_at || '—'}</div>
                  </li>
                )}
              </ol>
            </section>

            {/* Action bar — status-driven */}
            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => requestDelete([detailOrder.id])}
                className="px-3 py-1.5 text-[12.5px] font-medium rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.orders.delete}
              </button>
              {(detailOrder.status === 'pending' ||
                detailOrder.status === 'paid' ||
                detailOrder.status === 'shipped') && (
                <button
                  type="button"
                  onClick={() => requestCancel([detailOrder.id])}
                  className="px-3 py-1.5 text-[12.5px] font-medium rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  {t.admin.orders.cancel}
                </button>
              )}
              {detailOrder.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => setStatus(detailOrder.id, 'paid')}
                  className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {t.admin.orders.markPaid}
                </button>
              )}
              {detailOrder.status === 'paid' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus(detailOrder.id, 'shipped');
                      setDetailId(null);
                    }}
                    className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-700 transition-colors"
                  >
                    {t.admin.orders.ship}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundingId(detailOrder.id)}
                    className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    {t.admin.orders.refund}
                  </button>
                </>
              )}
              {detailOrder.status === 'shipped' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus(detailOrder.id, 'completed');
                    setDetailId(null);
                  }}
                  className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-700 transition-colors"
                >
                  {t.admin.orders.complete}
                </button>
              )}
              {detailOrder.status === 'completed' && (
                <span className="text-[12px] text-neutral-500 self-center">— {t.admin.orders.evtCompleted} —</span>
              )}
              {detailOrder.status === 'cancelled' && (
                <span className="text-[12px] text-neutral-500 self-center">— {t.admin.orders.evtCancelled} —</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel confirm modal */}
      <Modal
        open={cancellingIds !== null}
        title={t.admin.orders.cancelTitle}
        onClose={() => {
          setCancellingIds(null);
          setCancelReason('');
        }}
        width="460px"
      >
        {cancellingIds && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-3">{t.admin.orders.cancelBody(cancellingIds.length)}</p>
            {cancellingIds.length <= 5 && (
              <ul className="text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 mb-3 space-y-1">
                {cancellingIds.map((id) => {
                  const o = orders.find((x: any) => x.id === id);
                  return o ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="font-mono text-neutral-500">#{o.order_no}</span>
                      <span className="truncate">{o.nickname} · {usd(o.amount)}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            <label htmlFor="o-cancel-reason" className="block text-[12px] font-semibold text-neutral-700 mb-1">
              {t.admin.orders.cancelReasonLabel}
            </label>
            <textarea
              id="o-cancel-reason"
              autoFocus
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t.admin.orders.cancelReasonPh}
              rows={2}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setCancellingIds(null);
                  setCancelReason('');
                }}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t.admin.orders.confirmCancel}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund confirm modal */}
      <Modal
        open={refundingId !== null}
        title={t.admin.orders.refundTitle}
        onClose={() => setRefundingId(null)}
        width="440px"
      >
        {refundingOrder && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-3">
              {t.admin.orders.refundBody(usd(refundingOrder.amount), refundingOrder.order_no)}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundingId(null)}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={confirmRefund}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t.admin.orders.confirmRefund}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deletingIds !== null}
        title={t.admin.orders.deleteTitle}
        onClose={() => setDeletingIds(null)}
        width="440px"
      >
        {deletingIds && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-2">{t.admin.orders.deleteBody(deletingIds.length)}</p>
            {deletingIds.length <= 5 && (
              <ul className="text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 mb-3 space-y-1">
                {deletingIds.map((id) => {
                  const o = orders.find((x: any) => x.id === id);
                  return o ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="font-mono text-neutral-500">#{o.order_no}</span>
                      <span className="truncate">{o.nickname} · {usd(o.amount)}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            <p className="text-[11.5px] text-neutral-500 mb-4">{t.admin.orders.deleteHint}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingIds(null)}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t.admin.orders.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
