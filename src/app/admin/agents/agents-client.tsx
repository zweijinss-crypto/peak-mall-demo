'use client';

import { useT } from '@/lib/use-t';
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
      <h1 className="text-[20px] font-extrabold text-neutral-900 mb-2">{t.admin.agents.title}</h1>
      <p className="text-[12.5px] text-neutral-500 mb-4 leading-relaxed">{t.admin.agents.hint}</p>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colRole}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colBal}</th>
              <th className="px-3 py-2 text-left">{t.admin.agents.colOwn}</th>
              <th className="px-3 py-2 text-left">{t.admin.agents.colSub}</th>
              <th className="px-3 py-2 text-left">{t.admin.agents.colLimit}</th>
              <th className="px-3 py-2 text-left">{t.admin.agents.colTrc20}</th>
              <th className="px-3 py-2 text-left">{t.admin.agents.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-neutral-500 py-6">{t.admin.agents.empty}</td></tr>
            ) : (
              agents.map((a: any) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{a.id}</td>
                  <td className="px-3 py-2">{a.nickname} <span className="text-neutral-700">@{a.username}</span></td>
                  <td className="px-3 py-2 font-bold">{usd(a.balance)}</td>
                  <td className="px-3 py-2"><input id={`own_${a.id}`} aria-label={`${t.admin.agents.colOwn} ${a.username}`} defaultValue={a.own_rate} className="border border-neutral-200 rounded px-1.5 py-1 w-[64px]" /> %</td>
                  <td className="px-3 py-2"><input id={`sub_${a.id}`} aria-label={`${t.admin.agents.colSub} ${a.username}`} defaultValue={a.sub_rate} className="border border-neutral-200 rounded px-1.5 py-1 w-[64px]" /> %</td>
                  <td className="px-3 py-2"><input id={`lim_${a.id}`} aria-label={`${t.admin.agents.colLimit} ${a.username}`} defaultValue={a.sub_rate_limit} className="border border-neutral-200 rounded px-1.5 py-1 w-[64px]" /> %</td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-[11px]">{a.withdraw_address || '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => save(a.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.agents.save}</button>
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