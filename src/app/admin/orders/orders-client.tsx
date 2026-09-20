'use client';

import { useState } from 'react';
import { PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { orderStatusLabel, usd, type OrderStatus } from '@/lib/admin/fixtures';

type Tab = 'all' | OrderStatus;

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-neutral-100 text-neutral-700',
  paid: 'bg-blue-100 text-blue-700',
  shipped: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
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
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[900px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">{t.admin.orders.colOrder}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colUser}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colAmt}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colPay}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colCard}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colContact}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colAddr}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colTime}</th>
              <th className="px-3 py-2 text-left">{t.admin.orders.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-neutral-500 py-6">{t.admin.orders.empty}</td></tr>
            ) : (
              filtered.map((o: any) => (
                <tr key={o.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono text-[11.5px]">{o.order_no}</td>
                  <td className="px-3 py-2">{o.nickname} <span className="text-neutral-700">@{o.username}</span></td>
                  <td className="px-3 py-2 font-bold">{usd(o.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[o.status as OrderStatus]}`}>
                      {orderStatusLabel(o.status, locale as any)}
                    </span>
                  </td>
                  <td className="px-3 py-2">{o.pay_method || t.admin.orders.dash}</td>
                  <td className="px-3 py-2">{o.card_last4 ? `${o.card_brand || ''} ****${o.card_last4}${o.card_expiry ? ` (${o.card_expiry})` : ''}` : t.admin.orders.dash}</td>
                  <td className="px-3 py-2">{o.contact_name || t.admin.orders.dash}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{o.address || t.admin.orders.dash}</td>
                  <td className="px-3 py-2 text-[11px] text-neutral-500">{o.created_at}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {o.status === 'paid' && (
                      <button onClick={() => ship(o.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.orders.ship}</button>
                    )}
                    {o.status === 'shipped' && (
                      <button onClick={() => complete(o.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.orders.complete}</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}