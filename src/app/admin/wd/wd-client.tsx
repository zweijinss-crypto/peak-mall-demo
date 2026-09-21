'use client';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd, wdStatusLabel, type WdStatus } from '@/lib/admin/fixtures';

const STATUS_KIND: Record<WdStatus, StatusKind> = {
  pending: 'pending',
  approved: 'info',
  paid: 'active',
  rejected: 'danger',
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
      <PageBanner title={t.admin.wd.title} accent="emerald" />
      <DataTable minWidth="720px">
          <thead>
            <tr>
              <Th>{t.admin.wd.colId}</Th>
              <Th>{t.admin.wd.colUser}</Th>
              <Th>{t.admin.wd.colAmt}</Th>
              <Th>{t.admin.wd.colFee}</Th>
              <Th>{t.admin.wd.colMethod}</Th>
              <Th>{t.admin.wd.colReject}</Th>
              <Th>{t.admin.wd.colStatus}</Th>
              <Th>{t.admin.wd.colTime}</Th>
              <Th>{t.admin.wd.colAddr}</Th>
              <Th>{t.admin.wd.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {wd.length === 0 ? (
              <tr><Td colSpan={10} className="text-center text-neutral-500 py-6">{t.admin.wd.empty}</Td></tr>
            ) : (
              wd.map((w: any) => {
                const mismatch = w.method === 'usdt_trc20' && w.bound_address && w.account && w.account !== w.bound_address;
                return (
                  <tr key={w.id} className="hover:bg-neutral-50 transition-colors">
                    <Td className="font-mono text-[12px]">#{w.id}</Td>
                    <Td>@{w.username}</Td>
                    <Td className="font-bold tabular-nums">{usd(w.amount)}</Td>
                    <Td>{usd(w.fee)}</Td>
                    <Td>{w.method === 'usdt_trc20' ? 'USDT-TRC20' : w.method}</Td>
                    <Td muted className="max-w-[180px] truncate">{w.reject_reason || '—'}</Td>
                    <Td>
                      <StatusBadge kind={STATUS_KIND[w.status as WdStatus]}>
                        {wdStatusLabel(w.status, locale as any)}
                      </StatusBadge>
                    </Td>
                    <Td muted>{w.created_at}</Td>
                    <Td muted className="max-w-[180px] truncate">
                      {w.bound_address ? w.bound_address : <span className="text-neutral-700">{t.admin.wd.unbound}</span>}
                      {mismatch && <div className="text-rose-600 font-semibold mt-1">{t.admin.wd.addrMismatch}</div>}
                    </Td>
                    <Td className="whitespace-nowrap">
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
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
    </div>
  );
}