'use client';

import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd, wdStatusLabel, type WdStatus } from '@/lib/admin/fixtures';

const STATUS_CLASS: Record<WdStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export function WdClient() {
  const t = useT();
  const [wd, setWd, mounted, isEn] = useAdminStore('wd');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const locale = isEn ? 'en' : 'zh';
  const approve = (id: number) => setWd(wd.map((w: any) => (w.id === id ? { ...w, status: 'approved' as const } : w)));
  const reject = (id: number) => {
    const reason = window.prompt(isEn ? 'Reject reason?' : '驳回原因?') || '—';
    setWd(wd.map((w: any) => (w.id === id ? { ...w, status: 'rejected' as const, reject_reason: reason } : w)));
  };
  const markPaid = (id: number) => setWd(wd.map((w: any) => (w.id === id ? { ...w, status: 'paid' as const } : w)));

  return (
    <div>
      <h1 className="text-[20px] font-extrabold text-neutral-900 mb-3">{t.admin.wd.title}</h1>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[920px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">{t.admin.wd.colId}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colUser}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colAmt}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colFee}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colMethod}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colReject}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colTime}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colAddr}</th>
              <th className="px-3 py-2 text-left">{t.admin.wd.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {wd.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-neutral-500 py-6">{t.admin.wd.empty}</td></tr>
            ) : (
              wd.map((w: any) => {
                const mismatch = w.method === 'usdt_trc20' && w.bound_address && w.account && w.account !== w.bound_address;
                return (
                  <tr key={w.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-mono">#{w.id}</td>
                    <td className="px-3 py-2">@{w.username}</td>
                    <td className="px-3 py-2 font-bold">{usd(w.amount)}</td>
                    <td className="px-3 py-2">{usd(w.fee)}</td>
                    <td className="px-3 py-2">{w.method === 'usdt_trc20' ? 'USDT-TRC20' : w.method}</td>
                    <td className="px-3 py-2 max-w-[180px] truncate">{w.reject_reason || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[w.status as WdStatus]}`}>
                        {wdStatusLabel(w.status, locale as any)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-neutral-500">{w.created_at}</td>
                    <td className="px-3 py-2 max-w-[180px] truncate text-[11px]">
                      {w.bound_address ? w.bound_address : <span className="text-neutral-700">{t.admin.wd.unbound}</span>}
                      {mismatch && <div className="text-rose-600 font-semibold mt-1">{t.admin.wd.addrMismatch}</div>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {w.status === 'pending' && (
                        <>
                          <button onClick={() => approve(w.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700 mr-1">{t.admin.wd.approve}</button>
                          <button onClick={() => reject(w.id)} className="px-2 py-0.5 text-[11px] rounded bg-rose-600 text-white hover:bg-rose-700">{t.admin.wd.reject}</button>
                        </>
                      )}
                      {w.status === 'approved' && (
                        <button onClick={() => markPaid(w.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.wd.markPaid}</button>
                      )}
                      {(w.status === 'paid' || w.status === 'rejected') && (
                        <span className="text-neutral-700 text-[11px]">{t.admin.wd.view}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}