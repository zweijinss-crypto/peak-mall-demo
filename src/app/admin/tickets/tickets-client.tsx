'use client';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';

const STATUS_CLASS: Record<'open' | 'replied' | 'closed', string> = {
  open: 'bg-amber-100 text-amber-700',
  replied: 'bg-blue-100 text-blue-700',
  closed: 'bg-neutral-200 text-neutral-600',
};

export function TicketsClient() {
  const t = useT();
  const [tickets, setTickets, mounted] = useAdminStore('tickets');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const close = (id: number) => setTickets(tickets.map((x: any) => (x.id === id ? { ...x, status: 'closed' as const } : x)));
  const reply = (id: number) => setTickets(tickets.map((x: any) => (x.id === id ? { ...x, status: 'replied' as const } : x)));

  return (
    <div>
      <PageBanner title={t.admin.tickets.title} accent="emerald" />
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">{t.admin.tickets.colOrder}</th>
              <th className="px-3 py-2 text-left">{t.admin.tickets.colUser}</th>
              <th className="px-3 py-2 text-left">{t.admin.tickets.colReason}</th>
              <th className="px-3 py-2 text-left">{t.admin.tickets.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.tickets.colTime}</th>
              <th className="px-3 py-2 text-left">{t.admin.tickets.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-neutral-500 py-6">{t.admin.tickets.empty}</td></tr>
            ) : (
              tickets.map((x: any) => (
                <tr key={x.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{x.id}</td>
                  <td className="px-3 py-2 font-mono text-[11.5px]">{x.order_no}</td>
                  <td className="px-3 py-2">@{x.username}</td>
                  <td className="px-3 py-2 max-w-[260px] truncate">{x.reason}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[x.status as 'open' | 'replied' | 'closed']}`}>{x.status}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-neutral-500">{x.created_at}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {x.status !== 'closed' && (
                      <>
                        <button onClick={() => reply(x.id)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 mr-1">{t.admin.tickets.reply}</button>
                        <button onClick={() => close(x.id)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">{t.admin.tickets.close}</button>
                      </>
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