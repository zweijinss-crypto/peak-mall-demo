'use client';
import { useEffect, useState } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { adminStore, type AdminTicket } from '@/lib/admin/fixtures';
import { fetchAllTickets, setTicketStatus } from '@/lib/api/admin-tickets-api';

const STATUS_KIND: Record<'open' | 'replied' | 'closed', StatusKind> = {
  open: 'pending',
  replied: 'info',
  closed: 'mute',
};

export function TicketsClient() {
  const t = useT();
  const [tickets, setTickets] = useState<AdminTicket[]>(adminStore.tickets.read());
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [source, setSource] = useState<'local' | 'remote'>('local');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = adminStore.tickets.read();
      if (!cancelled) {
        setTickets(fresh);
        setMounted(true);
      }
      setSyncing(true);
      const remote = await fetchAllTickets();
      if (cancelled) return;
      if (remote && remote.length > 0) {
        setTickets(remote);
        adminStore.tickets.write(remote);
        setSource('remote');
      } else if (remote === null) {
        // Network error — keep local data, mark source ambiguous.
        setSource('local');
      } else {
        setSource('local');
      }
      setSyncing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const reply = async (id: number) => {
    const next = tickets.map((x) => (x.id === id ? { ...x, status: 'replied' as const } : x));
    setTickets(next);
    await setTicketStatus(id, 'replied');
  };
  const close = async (id: number) => {
    const next = tickets.map((x) => (x.id === id ? { ...x, status: 'closed' as const } : x));
    setTickets(next);
    await setTicketStatus(id, 'closed');
  };

  return (
    <div>
      <PageBanner
        title={t.admin.tickets.title}
        accent="emerald"
        trailing={
          <span className={`text-[11px] px-2 py-0.5 rounded border ${source === 'remote' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-neutral-300 text-neutral-500'}`}>
            {syncing ? t.admin.syncing : source === 'remote' ? t.admin.fromRemote : t.admin.fromLocal}
          </span>
        }
      />
      <DataTable minWidth="720px">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>{t.admin.tickets.colOrder}</Th>
              <Th>{t.admin.tickets.colUser}</Th>
              <Th>{t.admin.tickets.colReason}</Th>
              <Th>{t.admin.tickets.colStatus}</Th>
              <Th>{t.admin.tickets.colTime}</Th>
              <Th>{t.admin.tickets.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><Td colSpan={7} className="text-center text-neutral-500 py-6">{t.admin.tickets.empty}</Td></tr>
            ) : (
              tickets.map((x) => (
                <tr key={x.id} className="hover:bg-neutral-50 transition-colors">
                  <Td>{x.id}</Td>
                  <Td className="font-mono text-[12px]">{x.order_no}</Td>
                  <Td>@{x.username}</Td>
                  <Td muted className="max-w-[180px] truncate">{x.reason}</Td>
                  <Td>
                    <StatusBadge kind={STATUS_KIND[x.status]}>{x.status}</StatusBadge>
                  </Td>
                  <Td muted>{x.created_at}</Td>
                  <Td className="whitespace-nowrap">
                    {x.status !== 'closed' && (
                      <>
                        <button onClick={() => reply(x.id)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 mr-1">{t.admin.tickets.reply}</button>
                        <button onClick={() => close(x.id)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">{t.admin.tickets.close}</button>
                      </>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
    </div>
  );
}