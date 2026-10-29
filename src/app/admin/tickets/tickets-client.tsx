'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';
import { AdminToolbar, slicePage } from '@/components/admin/AdminToolbar';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { adminStore, type AdminTicket } from '@/lib/admin/fixtures';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { fetchAllTickets, setTicketStatus, setTicketReply } from '@/lib/api/admin-tickets-api';
import { toAdminCSV, downloadAdminCSV, csvFilename } from '@/lib/admin/admin-csv';

const STATUS_KIND: Record<'open' | 'replied' | 'closed', StatusKind> = {
  open: 'pending',
  replied: 'info',
  closed: 'mute',
};

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'open' | 'replied' | 'closed';

/**
 * TicketsClient — admin after-sales queue.
 *
 * Before this rewrite the page listed every ticket in one flat table
 * with no way to find anything and no way to see the customer's actual
 * complaint — the `reason` cell was truncated to 180px and there was no
 * detail view, so an admin literally could not read a long complaint
 * before replying to it.
 *
 * The copy strings for a detail modal, a reply box, status labels and
 * bulk actions already existed (t.admin.tickets.detail / replyPh /
 * statusOpen / bulkReply …) but were never referenced by any component.
 *
 * Now:
 *   - AdminToolbar: search (order # / user / reason), status filter,
 *     CSV export, pagination
 *   - per-row Detail button → modal with order / complaint / reply
 *   - reply text is persisted (new `reply` column, migration 0013)
 *   - bulk mark-replied / bulk close
 */
export function TicketsClient() {
  const t = useT();
  const [tickets, setTickets, mounted] = useAdminStore('tickets');
  const [syncing, setSyncing] = useState(false);
  const [source, setSource] = useState<'local' | 'remote'>('local');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ kind: 'success' | 'info'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = adminStore.tickets.read();
      if (!cancelled) {
        setTickets(fresh);
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

  const showToast = (kind: 'success' | 'info', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((x: AdminTicket) => {
      if (statusFilter !== 'all' && x.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(x.order_no ?? '').toLowerCase().includes(q) ||
        String(x.username ?? '').toLowerCase().includes(q) ||
        String(x.reason ?? '').toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = slicePage(filtered, safePage, PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const detail = detailId !== null ? tickets.find((x: AdminTicket) => x.id === detailId) ?? null : null;

  const exportCsv = () => {
    const headers = [
      t.admin.tickets.colOrder,
      t.admin.tickets.colUser,
      t.admin.tickets.colReason,
      t.admin.tickets.colStatus,
      t.admin.tickets.colTime,
    ];
    const rows = filtered.map((x: AdminTicket) => [
      x.order_no,
      x.username,
      x.reason,
      statusLabel(x.status),
      x.created_at,
    ]);
    downloadAdminCSV(csvFilename('admin-tickets'), toAdminCSV(headers, rows));
  };

  const reply = async (id: string) => {
    const next = tickets.map((x) => (x.id === id ? { ...x, status: 'replied' as const } : x));
    setTickets(next);
    await setTicketStatus(id, 'replied');
  };
  const close = async (id: string) => {
    const next = tickets.map((x) => (x.id === id ? { ...x, status: 'closed' as const } : x));
    setTickets(next);
    await setTicketStatus(id, 'closed');
  };

  const saveReply = async () => {
    if (!detail) return;
    const text = replyText.trim();
    const id = detail.id;
    setDetailId(null);
    setReplyText('');
    if (!text) return;
    await setTicketReply(id, text);
    setTickets(
      tickets.map((x) => (x.id === id ? { ...x, status: 'replied' as const } : x)),
    );
    showToast('success', t.admin.tickets.savedToast);
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    const ids = visible.map((x: AdminTicket) => x.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const bulkReply = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setTickets(tickets.map((x) => (selected.has(x.id) ? { ...x, status: 'replied' as const } : x)));
    for (const id of ids) await setTicketStatus(id, 'replied');
    setSelected(new Set());
    showToast('info', t.admin.tickets.bulkSelected(ids.length));
  };
  const bulkClose = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setTickets(tickets.map((x) => (selected.has(x.id) ? { ...x, status: 'closed' as const } : x)));
    for (const id of ids) await setTicketStatus(id, 'closed');
    setSelected(new Set());
    showToast('info', t.admin.tickets.bulkSelected(ids.length));
  };

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const allVisibleSelected =
    visible.length > 0 && visible.every((x: AdminTicket) => selected.has(x.id));

  // Status label helper — defined inline (not module-level) because it
  // needs the locale-aware copy object from useT(). A module-level
  // helper calling useT() would break the Rules of Hooks.
  const statusLabel = (status: 'open' | 'replied' | 'closed'): string => {
    if (status === 'open') return t.admin.tickets.statusOpen;
    if (status === 'replied') return t.admin.tickets.statusReplied;
    return t.admin.tickets.statusClosed;
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

      <AdminToolbar
        label={t.admin.tickets.toolbarLabel}
        searchPlaceholder={t.admin.tickets.searchPlaceholder}
        searchAriaLabel={t.admin.tickets.searchAriaLabel}
        search={search}
        onSearchChange={setSearch}
        filter={{
          ariaLabel: t.admin.tickets.filterStatus,
          value: statusFilter,
          onChange: (v) => setStatusFilter(v as StatusFilter),
          options: [
            { value: 'all', label: t.admin.tickets.filterAll },
            { value: 'open', label: t.admin.tickets.statusOpen },
            { value: 'replied', label: t.admin.tickets.statusReplied },
            { value: 'closed', label: t.admin.tickets.statusClosed },
          ],
        }}
        onExport={exportCsv}
        exportLabel={t.admin.tickets.exportCsv}
        resultCount={filtered.length}
        totalCount={tickets.length}
        page={safePage}
        pageCount={pageCount}
        onPageChange={setPage}
        paginationLabels={{
          prev: t.admin.pagePrev,
          next: t.admin.pageNext,
          page: t.admin.pageIndicator,
          current: safePage,
          total: pageCount,
        }}
      >
        {selected.size > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-neutral-600">{t.admin.tickets.bulkSelected(selected.size)}</span>
            <button
              type="button"
              onClick={bulkReply}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {t.admin.tickets.bulkReply}
            </button>
            <button
              type="button"
              onClick={bulkClose}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {t.admin.tickets.bulkClose}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {t.admin.tickets.bulkClear}
            </button>
          </div>
        )}
      </AdminToolbar>

      <DataTable minWidth="820px">
          <thead>
            <tr>
              <Th className="w-[34px]">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label={t.admin.tickets.selectAll}
                  className="w-3.5 h-3.5 accent-orange-700"
                />
              </Th>
              <Th>{t.admin.tickets.colOrder}</Th>
              <Th>{t.admin.tickets.colUser}</Th>
              <Th>{t.admin.tickets.colReason}</Th>
              <Th>{t.admin.tickets.colStatus}</Th>
              <Th>{t.admin.tickets.colTime}</Th>
              <Th>{t.admin.tickets.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><Td colSpan={7} className="text-center text-neutral-500 py-6">{t.admin.tickets.empty}</Td></tr>
            ) : (
              visible.map((x: AdminTicket) => (
                <tr key={x.id} className="hover:bg-neutral-50 transition-colors">
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(x.id)}
                      onChange={() => toggleOne(x.id)}
                      aria-label={`${t.admin.tickets.selectAll} ${x.order_no}`}
                      className="w-3.5 h-3.5 accent-orange-700"
                    />
                  </Td>
                  <Td className="font-mono text-[12px]">{x.order_no}</Td>
                  <Td>@{x.username}</Td>
                  <Td muted className="max-w-[220px] truncate" title={x.reason}>{x.reason}</Td>
                  <Td>
                    <StatusBadge kind={STATUS_KIND[x.status]}>{statusLabel(x.status)}</StatusBadge>
                  </Td>
                  <Td muted className="whitespace-nowrap">{x.created_at}</Td>
                  <Td className="whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => { setDetailId(x.id); setReplyText(''); }}
                      className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 mr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                    >
                      {t.admin.tickets.detail}
                    </button>
                    {x.status !== 'closed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => reply(x.id)}
                          className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 mr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                        >
                          {t.admin.tickets.reply}
                        </button>
                        <button
                          type="button"
                          onClick={() => close(x.id)}
                          className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                        >
                          {t.admin.tickets.close}
                        </button>
                      </>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>

      {toast && (
        <div className="mt-3 text-[12.5px] text-emerald-700" role="status" aria-live="polite">
          {toast.text}
        </div>
      )}

      <Modal
        open={detail !== null}
        title={t.admin.tickets.detailTitle}
        onClose={() => setDetailId(null)}
        width="520px"
      >
        {detail && (
          <div className="space-y-4">
            <section>
              <h3 className="text-[12px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                {t.admin.tickets.orderSection}
              </h3>
              <p className="text-[13px] text-neutral-800 font-mono">{detail.order_no}</p>
            </section>
            <section>
              <h3 className="text-[12px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                {t.admin.tickets.contentSection}
              </h3>
              <p className="text-[13px] text-neutral-700 leading-relaxed whitespace-pre-line break-words">
                {detail.reason}
              </p>
            </section>
            <section>
              <h3 className="text-[12px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                {t.admin.tickets.replySection}
              </h3>
              {detail.reply ? (
                <p className="text-[13px] text-neutral-700 leading-relaxed whitespace-pre-line break-words">
                  {detail.reply}
                </p>
              ) : (
                <p className="text-[12.5px] text-neutral-400">{t.admin.tickets.noReply}</p>
              )}
            </section>
            <section>
              <label htmlFor="ticket-reply-input" className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                {t.admin.tickets.replySection}
              </label>
              <textarea
                id="ticket-reply-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t.admin.tickets.replyPh}
                rows={4}
                className="w-full border border-neutral-200 rounded px-2.5 py-2 text-[13px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </section>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="px-3.5 py-1.5 text-[12.5px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                {t.admin.tickets.cancel}
              </button>
              <button
                type="button"
                onClick={saveReply}
                className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 transition-colors"
              >
                {t.admin.tickets.saveReply}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}