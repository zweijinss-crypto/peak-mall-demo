'use client';

import { useState } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd, wdStatusLabel, type WdStatus } from '@/lib/admin/fixtures';

type Tab = 'all' | WdStatus;

const STATUS_CLASS: Record<WdStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export function WdCenterClient() {
  const t = useT();
  const [wd, mounted, isEnPath] = useAdminStore('wd');
  const [tab, setTab] = useState<Tab>('all');
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState<'usdt_trc20' | 'card'>('usdt_trc20');
  const [msg, setMsg] = useState('');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const locale = isEnPath ? 'en' : 'zh';
  const filtered = tab === 'all' ? wd : wd.filter((w: any) => w.status === tab);
  const tabs: Array<[Tab, string]> = [
    ['all', t.admin.wdCenter.tabs.all],
    ['pending', t.admin.wdCenter.tabs.pending],
    ['approved', t.admin.wdCenter.tabs.approved],
    ['rejected', t.admin.wdCenter.tabs.rejected],
    ['paid', t.admin.wdCenter.tabs.paid],
  ];
  const submit = () => {
    const v = Number(amt);
    if (!v || v < 10) {
      setMsg(isEnPath ? 'Min is $10' : '最低 $10');
      return;
    }
    setMsg(isEnPath ? `Submitted $${v} via ${method}` : `已提交 $${v} via ${method}`);
    setAmt('');
  };

  return (
    <div>
      <PageBanner title={t.admin.wdCenter.title} accent="emerald" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 lg:col-span-1">
          <h2 className="text-[14px] font-bold text-neutral-900 mb-3">{t.admin.wdCenter.apply}</h2>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.wdCenter.balance}</label>
          <div className="text-[22px] font-extrabold text-orange-600 mb-3">{usd(1240.32)}</div>
          <label htmlFor="wd-amt" className="block text-[12px] text-neutral-600 mb-1">{t.admin.wdCenter.colAmt}</label>
          <input id="wd-amt" value={amt} onChange={(e) => setAmt(e.target.value)} type="number" className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] mb-3" />
          <label htmlFor="wd-method" className="block text-[12px] text-neutral-600 mb-1">{t.admin.wdCenter.colMethod}</label>
          <select id="wd-method" value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] mb-3">
            <option value="usdt_trc20">USDT-TRC20</option>
            <option value="card">Card</option>
          </select>
          <p className="text-[11.5px] text-neutral-500 mb-3">{t.admin.wdCenter.min}: $10</p>
          <button onClick={submit} className="w-full py-2 rounded-md bg-orange-700 text-white font-bold text-[13px] hover:bg-orange-700">
            {t.admin.wdCenter.apply}
          </button>
          {msg && <div className="mt-2 text-emerald-600 text-[12.5px]">{msg}</div>}
        </div>
        <div className="lg:col-span-2">
          <div className="flex gap-3 border-b border-neutral-200 mb-3 overflow-x-auto">
            {tabs.map(([k, n]) => (
              <button key={k} onClick={() => setTab(k)} className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${tab === k ? 'border-orange-600 text-orange-700' : 'border-transparent text-neutral-600 hover:text-neutral-900'}`}>{n}</button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[640px]">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colId}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colAmt}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colFee}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colMethod}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colAccount}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colStatus}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colTime}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-neutral-500 py-6">{t.admin.wdCenter.empty}</td></tr>
                ) : (
                  filtered.map((w: any) => (
                    <tr key={w.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2 font-mono">#{w.id}</td>
                      <td className="px-3 py-2 font-bold">{usd(w.amount)}</td>
                      <td className="px-3 py-2">{usd(w.fee)}</td>
                      <td className="px-3 py-2">{w.method === 'usdt_trc20' ? 'USDT-TRC20' : w.method}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate text-[11px]">{w.account || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[w.status as WdStatus]}`}>{wdStatusLabel(w.status, locale as any)}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-neutral-500">{w.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}