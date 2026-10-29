'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageBanner } from '@/components/peak-mall';
import { AdminToolbar, slicePage } from '@/components/admin/AdminToolbar';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';
import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';
import { isSupabaseConfigured } from '@/lib/api';
import { fetchAllComm, setCommStatus } from '@/lib/api/admin-comm-api';
import { toAdminCSV, downloadAdminCSV, csvFilename } from '@/lib/admin/admin-csv';

const STATUS_KIND: Record<'settled' | 'pending', StatusKind> = {
  settled: 'active',
  pending: 'pending',
};

const PAGE_SIZE = 20;

type SortKey = 'newest' | 'oldest' | 'amountDesc' | 'amountAsc';

/**
 * CommClient — admin commission ledger.
 *
 * Before this rewrite the page was a read-only 7-column table: no search,
 * no status filter, no sort, no pagination, no export, and no way to act
 * on a pending entry. With 500 rows fetched from Supabase (admin-comm-api
 * limits to 500) an admin had to scroll a flat table to find anything.
 *
 * Now:
 *   - AdminToolbar: search (user / order no / source), status filter,
 *     sort, CSV export, pagination
 *   - per-row Settle action for pending entries (confirm modal),
 *     which also credits the user's available balance
 *   - CSV exports the *filtered* view, not the raw table, so what you
 *     download matches what you were looking at
 */
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'pending'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ kind: 'success' | 'danger' | 'info'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = comm.filter((c: any) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(c.username ?? '').toLowerCase().includes(q) ||
        String(c.source ?? '').toLowerCase().includes(q) ||
        String(c.id ?? '').toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a: any, b: any) => {
      switch (sortKey) {
        case 'oldest':
          return String(a.created_at).localeCompare(String(b.created_at));
        case 'amountDesc':
          return Number(b.amount) - Number(a.amount);
        case 'amountAsc':
          return Number(a.amount) - Number(b.amount);
        case 'newest':
        default:
          return String(b.created_at).localeCompare(String(a.created_at));
      }
    });

    return rows;
  }, [comm, search, statusFilter, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = slicePage(filtered, safePage, PAGE_SIZE);

  // Reset to page 1 whenever the filter set changes — otherwise the user
  // can be left on an empty page (e.g. filtering down to 2 rows while
  // sitting on page 4).
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortKey]);

  const exportCsv = () => {
    const headers = [
      t.admin.comm.colUser,
      t.admin.comm.colAmt,
      t.admin.comm.colSource,
      t.admin.comm.colRate,
      t.admin.comm.colStatus,
      t.admin.comm.colTime,
    ];
    const rows = filtered.map((c: any) => [
      c.username,
      Number(c.amount).toFixed(2),
      c.source,
      c.rate,
      c.status === 'settled' ? t.admin.comm.settled : t.admin.comm.pending,
      c.created_at,
    ]);
    downloadAdminCSV(csvFilename('admin-comm'), toAdminCSV(headers, rows));
  };

  const showToast = (kind: 'success' | 'danger' | 'info', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 3000);
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
    const ids = visible.map((c: any) => c.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  /**
   * Bulk settle — settle every selected pending commission.
   *
   * Each row goes through setCommStatus() individually so the
   * settle_commission() RPC does the per-row money movement (and so a
   * single failure does not abort the rest). Rows that were already
   * settled are skipped.
   */
  const bulkSettle = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const targets = comm.filter(
      (c: any) => selected.has(c.id) && c.status === 'pending',
    );
    if (targets.length === 0) {
      showToast('info', t.admin.comm.bulkSelected(0));
      setSelected(new Set());
      return;
    }
    setComm(
      comm.map((c: any) =>
        selected.has(c.id) && c.status === 'pending'
          ? { ...c, status: 'settled' as const }
          : c,
      ),
    );
    let credited = 0;
    for (const c of targets) {
      const r = await setCommStatus(c.id, 'settled');
      if (r.ok && r.balanceCredited) credited += 1;
    }
    setSelected(new Set());
    showToast(
      credited === targets.length ? 'success' : 'info',
      t.admin.comm.bulkSettledToast(targets.length, credited),
    );
  };

  const confirmSettle = async () => {
    if (settlingId === null) return;
    const id = settlingId;
    const row = comm.find((c: any) => c.id === id);
    setSettlingId(null);
    if (!row) return;

    setComm(comm.map((c: any) => (c.id === id ? { ...c, status: 'settled' as const } : c)));
    const r = await setCommStatus(id, 'settled');
    if (r.ok) {
      showToast(
        r.balanceCredited ? 'success' : 'info',
        r.balanceCredited
          ? t.admin.comm.settledToast(String(id))
          : t.admin.comm.settledNoCreditToast,
      );
    } else {
      // Roll back the optimistic update.
      setComm(comm.map((c: any) => (c.id === id ? { ...c, status: 'pending' as const } : c)));
      showToast('danger', t.admin.comm.settleFailedToast);
    }
  };

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const settlingRow = settlingId !== null ? comm.find((c: any) => c.id === settlingId) : null;
  const allVisibleSelected =
    visible.length > 0 && visible.every((c: any) => selected.has(c.id));

  return (
    <div>
      <PageBanner title={t.admin.comm.title} accent="emerald" />

      <AdminToolbar
        label={t.admin.comm.toolbarLabel}
        searchPlaceholder={t.admin.comm.searchPlaceholder}
        searchAriaLabel={t.admin.comm.searchAriaLabel}
        search={search}
        onSearchChange={setSearch}
        filter={{
          ariaLabel: t.admin.comm.filterStatus,
          value: statusFilter,
          onChange: (v) => setStatusFilter(v as 'all' | 'settled' | 'pending'),
          options: [
            { value: 'all', label: t.admin.comm.filterAll },
            { value: 'settled', label: t.admin.comm.settled },
            { value: 'pending', label: t.admin.comm.pending },
          ],
        }}
        sort={{
          ariaLabel: t.admin.comm.sortBy,
          value: sortKey,
          onChange: (v) => setSortKey(v as SortKey),
          options: [
            { value: 'newest', label: t.admin.comm.sortNewest },
            { value: 'oldest', label: t.admin.comm.sortOldest },
            { value: 'amountDesc', label: t.admin.comm.sortAmountDesc },
            { value: 'amountAsc', label: t.admin.comm.sortAmountAsc },
          ],
        }}
        onExport={exportCsv}
        exportLabel={t.admin.comm.exportCsv}
        resultCount={filtered.length}
        totalCount={comm.length}
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
            <span className="text-[12px] text-neutral-600">{t.admin.comm.bulkSelected(selected.size)}</span>
            <button
              type="button"
              onClick={bulkSettle}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {t.admin.comm.bulkSettle}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {t.admin.comm.bulkClear}
            </button>
          </div>
        )}
      </AdminToolbar>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="w-[34px] px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label={t.admin.comm.selectAll}
                  className="w-3.5 h-3.5 accent-orange-700"
                />
              </th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colUser}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colAmt}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colSource}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colRate}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colTime}</th>
              <th className="px-3 py-2 text-left">{t.admin.comm.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-neutral-500 py-6">{t.admin.comm.empty}</td></tr>
            ) : (
              visible.map((c: any) => (
                <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`${t.admin.comm.selectAll} ${c.username} ${c.source}`}
                      className="w-3.5 h-3.5 accent-orange-700"
                    />
                  </td>
                  <td className="px-3 py-2">@{c.username}</td>
                  <td className="px-3 py-2 font-bold tabular-nums">{usd(Number(c.amount))}</td>
                  <td className="px-3 py-2 font-mono text-[11.5px]">{c.source}</td>
                  <td className="px-3 py-2 tabular-nums">{c.rate}%</td>
                  <td className="px-3 py-2">
                    <StatusBadge kind={STATUS_KIND[c.status as 'settled' | 'pending'] ?? 'mute'}>
                      {c.status === 'settled' ? t.admin.comm.settled : t.admin.comm.pending}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-neutral-500 whitespace-nowrap">{c.created_at}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {c.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => setSettlingId(c.id)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-700 text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 transition-colors"
                      >
                        {t.admin.comm.settle}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div
          className={`mt-3 text-[12.5px] ${toast.kind === 'success' ? 'text-emerald-700' : toast.kind === 'info' ? 'text-amber-700' : 'text-rose-700'}`}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      )}

      <Modal
        open={settlingRow !== null}
        title={t.admin.comm.settleConfirmTitle}
        onClose={() => setSettlingId(null)}
      >
        <p className="text-[13px] text-neutral-700 leading-relaxed">
          {String(t.admin.comm.settleConfirmBody).replace(
            '{amount}',
            settlingRow ? usd(Number(settlingRow.amount)) : '',
          )}
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => setSettlingId(null)}
            className="px-3.5 py-1.5 text-[12.5px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
          >
            {t.admin.tickets.cancel}
          </button>
          <button
            type="button"
            onClick={confirmSettle}
            className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 transition-colors"
          >
            {t.admin.comm.settle}
          </button>
        </div>
      </Modal>
    </div>
  );
}
