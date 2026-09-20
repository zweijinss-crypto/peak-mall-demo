'use client';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';

export function InviteClient() {
  const t = useT();
  const [invites, setInvites, mounted] = useAdminStore('invites');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const add = () => {
    const code = `PM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setInvites([...invites, { code, used: 0, limit: 50, created_at: '2026-09-20', status: 'active' as const }]);
  };
  const toggle = (code: string) =>
    setInvites(invites.map((i: any) => (i.code === code ? { ...i, status: i.status === 'active' ? 'disabled' : 'active' } : i)));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <PageBanner title={t.admin.invite.title} accent="emerald" />
        <button onClick={add} className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-700">
          + {t.admin.invite.add}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[600px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">{t.admin.invite.colCode}</th>
              <th className="px-3 py-2 text-left">{t.admin.invite.colUsed}</th>
              <th className="px-3 py-2 text-left">{t.admin.invite.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.invite.colTime}</th>
              <th className="px-3 py-2 text-left">{t.admin.invite.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-neutral-500 py-6">{t.admin.invite.empty}</td></tr>
            ) : (
              invites.map((i: any) => (
                <tr key={i.code} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono">{i.code}</td>
                  <td className="px-3 py-2">{i.used} / {i.limit}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${i.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>{i.status}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-neutral-500">{i.created_at}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => toggle(i.code)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                      {i.status === 'active' ? t.admin.invite.disable : t.admin.invite.enable}
                    </button>
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