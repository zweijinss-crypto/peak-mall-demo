'use client';
import { useState, useMemo, useEffect } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';

import { PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { orderStatusLabel, usd, type OrderStatus } from '@/lib/admin/fixtures';
import { fetchAllOrdersForAdmin, isSupabaseConfigured } from '@/lib/api';
import { shipOrder, refundOrder } from '@/lib/api/admin-orders-api';

type Tab = 'all' | OrderStatus;

// Phase 2.2 — carrier list + tracking URL builder.
// Each carrier maps to a tracking URL template; `{tracking}` is the
// placeholder replaced at runtime.
const CARRIERS: Array<{ key: string; label: string; urlTemplate: string }> = [
  { key: 'USPS',         label: 'USPS',            urlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}' },
  { key: 'FedEx',        label: 'FedEx',           urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking}' },
  { key: 'UPS',          label: 'UPS',             urlTemplate: 'https://www.ups.com/track?tracknum={tracking}' },
  { key: 'DHL',          label: 'DHL',             urlTemplate: 'https://www.dhl.com/global-en/home/tracking.html?tracking-id={tracking}' },
  { key: 'SF Express',   label: 'SF Express',      urlTemplate: 'https://www.sf-international.com/cgi-bin/WebObjects/weBOutOrder?{tracking}' },
  { key: 'YTO',          label: 'YTO',             urlTemplate: 'https://www.yto.net.cn/?{tracking}' },
  { key: 'Other',        label: 'Other',           urlTemplate: '' },
];

function buildTrackingUrl(carrier: string, trackingNo: string): string {
  const c = CARRIERS.find((x) => x.key === carrier);
  if (!c || !c.urlTemplate) return '';
  return c.urlTemplate.replace('{tracking}', encodeURIComponent(trackingNo));
}

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

  // Phase 1.1 stub: fetch from Supabase once per mount to validate
  // connectivity. The local fixture table remains the source of truth
  // until admin auth (Phase 1.3) and the uuid id migration land — both
  // are prerequisites for a full switch.
  useEffect(() => {
    if (!mounted || !isSupabaseConfigured()) return;
    let cancelled = false;
    void fetchAllOrdersForAdmin().then((rows) => {
      if (cancelled || rows === null) return;
      // eslint-disable-next-line no-console
      console.info(
        `[admin/orders] Supabase reachable — ${rows.length} orders in db. ` +
          'Switching to remote data requires Phase 1.3 (admin auth) + ' +
          'uuid id migration. Currently ignored to preserve fixture UX.',
      );
    });
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const [tab, setTab] = useState<Tab>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Modal state — one at a time.
  const [detailId, setDetailId] = useState<number | null>(null);
  const [cancellingIds, setCancellingIds] = useState<number[] | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<number[] | null>(null);

  // Phase 2.4 — refund dialog state (amount + reason)
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('requested_by_customer');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundErr, setRefundErr] = useState<string | null>(null);

  // Phase 2.2 — shipping dialog state
  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);
  const [shipCarrier, setShipCarrier] = useState<string>('USPS');
  const [shipTrackingNo, setShipTrackingNo] = useState<string>('');
  const [shippingBusy, setShippingBusy] = useState(false);
  const [shippingErr, setShippingErr] = useState<string | null>(null);

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

  const confirmRefund = async () => {
    if (refundingId === null || !refundingOrder) return;
    const remaining = Number(refundingOrder.amount) - Number(refundingOrder.refund_amount ?? 0);
    const amt = Number(refundAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setRefundErr(isEn ? 'Enter a positive amount.' : '请输入大于 0 的金额。');
      return;
    }
    if (amt > remaining + 0.005) {
      setRefundErr(
        isEn
          ? `Maximum refundable is ${usd(remaining)}.`
          : `可退金额上限 ${usd(remaining)}。`,
      );
      return;
    }
    setRefundBusy(true);
    setRefundErr(null);
    const result = await refundOrder(String(refundingOrder.id), amt, refundReason);
    if (!result.ok) {
      setRefundErr(result.error);
      setRefundBusy(false);
      return;
    }
    // Optimistic UI update — server has already persisted.
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newRefundedTotal = Number(refundingOrder.refund_amount ?? 0) + amt;
    const orderTotal = Number(refundingOrder.amount);
    const isFull = newRefundedTotal >= orderTotal - 0.005;
    setOrders(
      orders.map((o: any) =>
        o.id === refundingId
          ? {
              ...o,
              refunded: true,
              refund_at: isFull ? now : o.refund_at,
              refund_amount: newRefundedTotal,
              refund_state: isFull ? 'full' : 'partial',
              status: isFull ? ('cancelled' as const) : o.status,
              payment_status: isFull ? 'refunded' : o.payment_status,
              updated_at: now,
            }
          : o,
      ),
    );
    setRefundingId(null);
    setRefundAmount('');
    setRefundReason('requested_by_customer');
    setRefundBusy(false);
  };

  // Phase 2.2 — confirm ship + fire shipment email.
  // 1. Persist carrier / tracking_no / shipped_at to orders via supabase.
  // 2. Fire shipment_notification email to buyer (best-effort).
  const confirmShip = async () => {
    if (shippingOrderId === null) return;
    if (!shipCarrier) {
      setShippingErr(isEn ? 'Pick a carrier.' : '请选择物流公司。');
      return;
    }
    if (shipCarrier !== 'Other' && !shipTrackingNo.trim()) {
      setShippingErr(isEn ? 'Tracking number required.' : '请输入运单号。');
      return;
    }
    setShippingBusy(true);
    setShippingErr(null);

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const trackingNo = shipTrackingNo.trim();
    const trackingUrl = buildTrackingUrl(shipCarrier, trackingNo);
    const target = orders.find((o: any) => o.id === shippingOrderId);

    // Optimistic UI update first so the admin sees the change instantly.
    setOrders(
      orders.map((o: any) =>
        o.id === shippingOrderId
          ? {
              ...o,
              status: 'shipped' as const,
              carrier: shipCarrier,
              tracking_no: trackingNo,
              tracking_url: trackingUrl,
              shipped_at: now,
              updated_at: now,
            }
          : o,
      ),
    );

    // Persist to Supabase
    const ok = await shipOrder(shippingOrderId, shipCarrier, trackingNo);

    // Fire shipment email — best-effort, don't block UI on errors.
    if (ok && target) {
      try {
        const sendRes = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN
              ? { 'x-internal-token': process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN }
              : {}),
          },
          body: JSON.stringify({
            kind: 'shipment_notification',
            to: target.buyer_email ?? '',
            data: {
              orderNumber: target.order_no ?? String(target.id),
              customerName: target.contact_name ?? target.nickname,
              carrier: shipCarrier,
              trackingNumber: trackingNo,
              trackingUrl,
              siteUrl: typeof window !== 'undefined' ? window.location.origin : '',
            },
          }),
        });
        if (!sendRes.ok) {
          // eslint-disable-next-line no-console
          console.warn('[ship] email send failed:', sendRes.status);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ship] email dispatch error:', err);
      }
    } else if (!ok) {
      // Roll back the optimistic update
      setOrders(orders);
      setShippingErr(isEn ? 'Failed to save shipment.' : '保存发货信息失败,请重试。');
      setShippingBusy(false);
      return;
    }

    setShippingBusy(false);
    setShippingOrderId(null);
    setShipTrackingNo('');
    setShipCarrier('USPS');
    setDetailId(null);
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
                      setShipCarrier('USPS');
                      setShipTrackingNo('');
                      setShippingErr(null);
                      setShippingOrderId(detailOrder.id);
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

      {/* Refund confirm modal — Phase 2.4 with amount + reason */}
      <Modal
        open={refundingId !== null}
        title={t.admin.orders.refundTitle}
        onClose={() => {
          if (refundBusy) return;
          setRefundingId(null);
          setRefundAmount('');
          setRefundErr(null);
        }}
        width="440px"
      >
        {refundingOrder && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-3">
              {t.admin.orders.refundBody(usd(refundingOrder.amount), refundingOrder.order_no)}
            </p>
            <p className="text-[12px] text-neutral-500 mb-3">
              {isEn
                ? `Already refunded: ${usd(Number(refundingOrder.refund_amount ?? 0))} • Refundable: ${usd(Math.max(0, Number(refundingOrder.amount) - Number(refundingOrder.refund_amount ?? 0)))}`
                : `已退款：${usd(Number(refundingOrder.refund_amount ?? 0))} · 可退金额：${usd(Math.max(0, Number(refundingOrder.amount) - Number(refundingOrder.refund_amount ?? 0)))}`}
            </p>

            <label className="block text-[12px] font-medium text-neutral-700 mb-1" htmlFor="refund-amount">
              {isEn ? 'Refund amount (USD)' : '退款金额（美元）'}
            </label>
            <input
              id="refund-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={String(
                Math.max(0, Number(refundingOrder.amount) - Number(refundingOrder.refund_amount ?? 0)).toFixed(2),
              )}
              disabled={refundBusy}
              aria-label={isEn ? 'Refund amount in USD' : '退款金额（美元）'}
              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-md mb-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />

            <label className="block text-[12px] font-medium text-neutral-700 mb-1" htmlFor="refund-reason">
              {isEn ? 'Reason' : '原因'}
            </label>
            <select
              id="refund-reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              disabled={refundBusy}
              aria-label={isEn ? 'Refund reason' : '退款原因'}
              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-md mb-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            >
              <option value="requested_by_customer">
                {isEn ? 'Customer request' : '客户申请'}
              </option>
              <option value="duplicate">{isEn ? 'Duplicate charge' : '重复扣款'}</option>
              <option value="fraudulent">{isEn ? 'Fraud' : '欺诈'}</option>
              <option value="damaged">{isEn ? 'Damaged item' : '商品损坏'}</option>
              <option value="other">{isEn ? 'Other' : '其他'}</option>
            </select>

            {refundErr && (
              <div role="alert" className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5 mb-3">
                {refundErr}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (refundBusy) return;
                  setRefundingId(null);
                  setRefundAmount('');
                  setRefundErr(null);
                }}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={confirmRefund}
                disabled={refundBusy}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refundBusy
                  ? isEn
                    ? 'Processing…'
                    : '处理中…'
                  : t.admin.orders.confirmRefund}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Phase 2.2 — Ship dialog (carrier + tracking_no) */}
      <Modal
        open={shippingOrderId !== null}
        title={t.admin.orders.shipTitle ?? 'Mark as shipped'}
        onClose={() => {
          if (shippingBusy) return;
          setShippingOrderId(null);
          setShippingErr(null);
        }}
        width="460px"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-neutral-700">
            {t.admin.orders.shipBody ?? 'Pick a carrier and enter the tracking number. The buyer will be emailed the tracking link automatically.'}
          </p>

          <div>
            <label htmlFor="ship-carrier" className="block text-[12px] font-medium text-neutral-700 mb-1">
              {isEn ? 'Carrier' : '物流公司'}
            </label>
            <select
              id="ship-carrier"
              value={shipCarrier}
              onChange={(e) => setShipCarrier(e.target.value)}
              disabled={shippingBusy}
              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CARRIERS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {shipCarrier !== 'Other' && (
            <div>
              <label htmlFor="ship-tracking" className="block text-[12px] font-medium text-neutral-700 mb-1">
                {isEn ? 'Tracking number' : '运单号'}
              </label>
              <input
                id="ship-tracking"
                type="text"
                value={shipTrackingNo}
                onChange={(e) => setShipTrackingNo(e.target.value)}
                disabled={shippingBusy}
                placeholder={isEn ? 'e.g. 9405511899223197428490' : '例如: SF1234567890'}
                className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {shipCarrier !== 'Other' && shipTrackingNo.trim() && (
            <div className="text-[12px] text-neutral-500 break-all">
              {isEn ? 'Tracking URL preview: ' : '运单链接预览: '}
              <a
                href={buildTrackingUrl(shipCarrier, shipTrackingNo.trim())}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline"
              >
                {buildTrackingUrl(shipCarrier, shipTrackingNo.trim())}
              </a>
            </div>
          )}

          {shippingErr && (
            <div role="alert" className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
              {shippingErr}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShippingOrderId(null);
                setShippingErr(null);
              }}
              disabled={shippingBusy}
              className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              {t.admin.wd.cancel}
            </button>
            <button
              type="button"
              onClick={confirmShip}
              disabled={shippingBusy}
              className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {shippingBusy ? (isEn ? 'Saving…' : '保存中…') : t.admin.orders.ship}
            </button>
          </div>
        </div>
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
