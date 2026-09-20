'use client';

import { useState } from 'react';
import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';

export function DemoClient() {
  const t = useT();
  const [orders, setOrders, , isEn] = useAdminStore('orders');
  const [last, setLast] = useState<string | null>(null);

  const trigger = () => {
    const orderNo = `PM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
    const newOrder = {
      id: Date.now(),
      order_no: orderNo,
      nickname: '演示用户',
      username: 'demo_user',
      amount: Math.round(Math.random() * 1500 * 100) / 100 + 99,
      status: 'paid' as const,
      pay_method: 'card',
      card_brand: 'VISA',
      card_last4: '1111',
      card_expiry: '12/28',
      contact_name: 'Demo',
      address: 'Demo address',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    setOrders([newOrder, ...(orders as any[])]);
    setLast(`${orderNo} · ${usd(newOrder.amount)}`);
  };

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[20px] font-extrabold text-neutral-900 mb-3">{t.admin.demo.title}</h1>
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <p className="text-[13px] text-neutral-700 mb-4 leading-relaxed">{t.admin.demo.hint}</p>
        <button onClick={trigger} className="px-4 py-2 rounded-md bg-orange-700 text-white font-bold text-[13px] hover:bg-orange-700">
          🧪 {t.admin.demo.trigger}
        </button>
        <div className="mt-4 text-[12.5px] text-neutral-500">
          {t.admin.demo.lastOrder}: <span className="font-mono">{last || t.admin.demo.none}</span>
        </div>
      </div>
    </div>
  );
}