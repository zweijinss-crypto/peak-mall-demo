'use client';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';

export function AgentsClient() {
  const t = useT();
  const [agents, setAgents, mounted] = useAdminStore('agents');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const save = (id: number) => {
    const own = Number((document.getElementById(`own_${id}`) as HTMLInputElement)?.value);
    const sub = Number((document.getElementById(`sub_${id}`) as HTMLInputElement)?.value);
    const lim = Number((document.getElementById(`lim_${id}`) as HTMLInputElement)?.value);
    setAgents(agents.map((a: any) => (a.id === id ? { ...a, own_rate: own, sub_rate: sub, sub_rate_limit: lim } : a)));
  };

  return (
    <div>
      <PageBanner title={t.admin.agents.title} accent="emerald" />
      <p className="text-[12.5px] text-neutral-500 mb-4 leading-relaxed">{t.admin.agents.hint}</p>
      <DataTable minWidth="720px">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>{t.admin.users.colRole}</Th>
              <Th>{t.admin.users.colBal}</Th>
              <Th>{t.admin.agents.colOwn}</Th>
              <Th>{t.admin.agents.colSub}</Th>
              <Th>{t.admin.agents.colLimit}</Th>
              <Th>{t.admin.agents.colTrc20}</Th>
              <Th>{t.admin.agents.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr><Td colSpan={8} className="text-center text-neutral-500 py-6">{t.admin.agents.empty}</Td></tr>
            ) : (
              agents.map((a: any) => (
                <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                  <Td>{a.id}</Td>
                  <Td>{a.nickname} <span className="text-neutral-700">@{a.username}</span></Td>
                  <Td className="font-bold tabular-nums">{usd(a.balance)}</Td>
                  <Td><input id={`own_${a.id}`} aria-label={`${t.admin.agents.colOwn} ${a.username}`} defaultValue={a.own_rate} className="border border-neutral-200 rounded px-1.5 py-1 w-[64px]" /> %</Td>
                  <Td><input id={`sub_${a.id}`} aria-label={`${t.admin.agents.colSub} ${a.username}`} defaultValue={a.sub_rate} className="border border-neutral-200 rounded px-1.5 py-1 w-[64px]" /> %</Td>
                  <Td><input id={`lim_${a.id}`} aria-label={`${t.admin.agents.colLimit} ${a.username}`} defaultValue={a.sub_rate_limit} className="border border-neutral-200 rounded px-1.5 py-1 w-[64px]" /> %</Td>
                  <Td muted className="max-w-[180px] truncate">{a.withdraw_address || '—'}</Td>
                  <Td>
                    <button onClick={() => save(a.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.agents.save}</button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
    </div>
  );
}