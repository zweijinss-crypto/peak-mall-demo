'use client';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useState } from 'react';
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

export function OrdersClient() {
  const t = useT();
  const [orders, setOrders, mounted, isEn] = useAdminStore('orders');
  const [tab, setTab] = useState<Tab>('all');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const locale = isEn ? 'en' : 'zh';
  const filtered = tab === 'all' ? orders : orders.filter((o: any) => o.status === tab);
  const tabs: Array<[Tab, string]> = [
    ['all', t.admin.orders.tabs.all],
    ['pending', t.admin.orders.tabs.pending],
    ['paid', t.admin.orders.tabs.paid],
    ['shipped', t.admin.orders.tabs.shipped],
    ['completed', t.admin.orders.tabs.completed],
    ['cancelled', t.admin.orders.tabs.cancelled],
  ];

  const ship = (id: number) => setOrders(orders.map((o: any) => (o.id === id ? { ...o, status: 'shipped' as const } : o)));
  const complete = (id: number) => setOrders(orders.map((o: any) => (o.id === id ? { ...o, status: 'completed' as const } : o)));

  return (
    <div>
      <PageBanner title={t.admin.orders.title} accent="emerald" />
      <div className="flex gap-3 border-b border-neutral-200 mb-4 overflow-x-auto">
        {tabs.map(([k, n]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${tab === k ? 'border-orange-600 text-orange-700' : 'border-transparent text-neutral-600 hover:text-neutral-900'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <DataTable minWidth="720px">
          <thead>
            <tr>
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
              <tr><Td colSpan={10} className="text-center text-neutral-500 py-6">{t.admin.orders.empty}</Td></tr>
            ) : (
              filtered.map((o: any) => (
                <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                  <Td className="font-mono text-[12px]">{o.order_no}</Td>
                  <Td>{o.nickname} <span className="text-neutral-700">@{o.username}</span></Td>
                  <Td className="font-bold tabular-nums">{usd(o.amount)}</Td>
                  <Td>
                    <StatusBadge kind={STATUS_KIND[o.status as OrderStatus]}>
                      {orderStatusLabel(o.status, locale as any)}
                    </StatusBadge>
                  </Td>
                  <Td>{o.pay_method || t.admin.orders.dash}</Td>
                  <Td>{o.card_last4 ? `${o.card_brand || ''} ****${o.card_last4}${o.card_expiry ? ` (${o.card_expiry})` : ''}` : t.admin.orders.dash}</Td>
                  <Td>{o.contact_name || t.admin.orders.dash}</Td>
                  <Td muted className="max-w-[180px] truncate">{o.address || t.admin.orders.dash}</Td>
                  <Td muted>{o.created_at}</Td>
                  <Td className="whitespace-nowrap">
                    {o.status === 'paid' && (
                      <button onClick={() => ship(o.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.orders.ship}</button>
                    )}
                    {o.status === 'shipped' && (
                      <button onClick={() => complete(o.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.orders.complete}</button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
    </div>
  );
}