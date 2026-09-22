'use client';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useEffect } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { isSupabaseConfigured } from '@/lib/api';
import { fetchAllInvites, addInvite as apiAddInvite, setInviteStatus } from '@/lib/api/admin-invite-api';

export function InviteClient() {
  const t = useT();
  const [invites, setInvites, mounted] = useAdminStore('invites');

  // Phase 1.1.8 — hydrate from Supabase invite_codes on mount.
  useEffect(() => {
    if (!mounted || !isSupabaseConfigured()) return;
    let cancelled = false;
    void fetchAllInvites().then((rows) => {
      if (cancelled || rows === null || rows.length === 0) return;
      setInvites(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, setInvites]);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const add = () => {
    const code = `PM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setInvites([...invites, { code, used: 0, limit: 50, created_at: '2026-09-20', status: 'active' as const }]);
    if (isSupabaseConfigured()) {
      void apiAddInvite(code, 50);
    }
  };
  const toggle = (code: string) => {
    const target = invites.find((i: any) => i.code === code);
    const next = target?.status === 'active' ? 'disabled' : 'active';
    setInvites(invites.map((i: any) => (i.code === code ? { ...i, status: next as 'active' | 'disabled' } : i)));
    if (isSupabaseConfigured()) {
      void setInviteStatus(code, next as 'active' | 'disabled');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <PageBanner title={t.admin.invite.title} accent="emerald" />
        <button onClick={add} className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-700">
          + {t.admin.invite.add}
        </button>
      </div>
      <DataTable minWidth="720px">
          <thead>
            <tr>
              <Th>{t.admin.invite.colCode}</Th>
              <Th>{t.admin.invite.colUsed}</Th>
              <Th>{t.admin.invite.colStatus}</Th>
              <Th>{t.admin.invite.colTime}</Th>
              <Th>{t.admin.invite.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr><Td colSpan={5} className="text-center text-neutral-500 py-6">{t.admin.invite.empty}</Td></tr>
            ) : (
              invites.map((i: any) => (
                <tr key={i.code} className="hover:bg-neutral-50 transition-colors">
                  <Td className="font-mono text-[12px]">{i.code}</Td>
                  <Td>{i.used} / {i.limit}</Td>
                  <Td>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${i.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>{i.status}</span>
                  </Td>
                  <Td muted>{i.created_at}</Td>
                  <Td>
                    <button onClick={() => toggle(i.code)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                      {i.status === 'active' ? t.admin.invite.disable : t.admin.invite.enable}
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
    </div>
  );
}