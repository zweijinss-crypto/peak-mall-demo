'use client';

import { useEffect } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';
import { isSupabaseConfigured } from '@/lib/api';
import { fetchAllComm } from '@/lib/api/admin-comm-api';

const STATUS_CLASS: Record<'settled' | 'pending', string> = {
  settled: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
};

export function CommClient() {
  const t = useT();
  const [comm, setComm, mounted] = useAdminStore('comm');

  // Phase 1.1.8 — hydrate from Supabase commissions on mount.
  useEffect(() => {
    if (!mounted || !isSupabaseConfigured()) return;
    let cancelled = false;
    void fetchAllComm().then((rows) => {
      if (cancelled || rows === null || rows.length === 0) return;
      setComm(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, setComm]);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  return (
    <div>
      <PageBanner title={t.admin.comm.title} accent="emerald" />
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colUser}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colAmt}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colSource}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colRate}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colTime}</th>
            </tr>
          </thead>
          <tbody>
            {comm.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-neutral-500 py-6">{t.admin.comm.empty}</td></tr>
            ) : (
              comm.map((c: any) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{c.id}</td>
                  <td className="px-3 py-2">@{c.username}</td>
                  <td className="px-3 py-2 font-bold">{usd(c.amount)}</td>
                  <td className="px-3 py-2 font-mono text-[11.5px]">{c.source}</td>
                  <td className="px-3 py-2">{c.rate}%</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[c.status as 'settled' | 'pending']}`}>
                      {c.status === 'settled' ? t.admin.comm.settled : t.admin.comm.pending}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-neutral-500">{c.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}