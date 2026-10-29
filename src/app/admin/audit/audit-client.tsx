'use client';

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/lib/use-t';
import { getSupabase } from '@/lib/api/supabase-client';
import { isSupabaseConfigured } from '@/lib/api';
import { hasRole } from '@/lib/admin/rbac';
import { AdminToolbar, slicePage } from '@/components/admin/AdminToolbar';
import { toAdminCSV, downloadAdminCSV, csvFilename } from '@/lib/admin/admin-csv';

/**
 * /admin/audit — super_admin only.
 *
 * Reads public.audit_log via Supabase (RLS gated to super_admin).
 * Shows latest 100 entries; client-side filter by resource + actor.
 *
 * Phase 1.4 — the two filters were plain inputs with no result count,
 * no pagination and no export. With 100 rows loaded the admin had to
 * scroll blind. Now it uses the shared AdminToolbar (search + count +
 * pagination) and can export the filtered view as CSV.
 */

const PAGE_SIZE = 25;

interface AuditRow {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Seed audit rows for demo mode (no Supabase).
 *
 * The audit page is the only admin page that had NO localStorage
 * fixture — every other one is backed by adminStore.<key>.read().
 * Without these, the static build shows an empty table and the
 * pagination controls never appear (1 page of 0 rows).
 *
 * `before` / `after` mirror the DB shape (JSONB snapshot).
 */
const SEED_AUDIT: AuditRow[] = [
  {
    id: 1,
    actor_id: null,
    actor_email: 'admin@peakmall.com',
    actor_role: 'super_admin',
    action: 'update',
    resource: 'products',
    resource_id: 'legacy-1',
    before: { status: false, price: 1299 },
    after: { status: true, price: 1299 },
    metadata: null,
    created_at: '2026-09-20 11:24:12',
  },
  {
    id: 2,
    actor_id: null,
    actor_email: 'ops@peakmall.com',
    actor_role: 'ops',
    action: 'update',
    resource: 'orders',
    resource_id: 'legacy-2',
    before: { status: 'paid' },
    after: { status: 'shipped' },
    metadata: null,
    created_at: '2026-09-20 13:48:40',
  },
  {
    id: 3,
    actor_id: null,
    actor_email: 'finance@peakmall.com',
    actor_role: 'finance',
    action: 'payout',
    resource: 'withdrawals',
    resource_id: 'legacy-3',
    before: { status: 'approved' },
    after: { status: 'paid' },
    metadata: null,
    created_at: '2026-09-20 15:02:05',
  },
  {
    id: 4,
    actor_id: null,
    actor_email: 'cs@peakmall.com',
    actor_role: 'cs',
    action: 'create',
    resource: 'tickets',
    resource_id: 'legacy-4',
    before: null,
    after: { status: 'open' },
    metadata: null,
    created_at: '2026-09-19 09:15:22',
  },
  {
    id: 5,
    actor_id: null,
    actor_email: 'admin@peakmall.com',
    actor_role: 'super_admin',
    action: 'update',
    resource: 'rules',
    resource_id: 'legacy-5',
    before: { rates: [8] },
    after: { rates: [10] },
    metadata: null,
    created_at: '2026-09-18 17:44:59',
  },
];

export function AuditClient() {
  const t = useT();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void (async () => {
      // Demo mode (no Supabase) — there is no role to look up, so
      // hasRole() always returns false and the page would show a
      // "no permission" card to everyone reviewing the static build.
      // AdminGateLayout already grants demo super_admin, so mirror
      // that here and show the seeded log instead.
      if (!isSupabaseConfigured()) {
        setAllowed(true);
        setRows(SEED_AUDIT);
        return;
      }
      const ok = await hasRole(['super_admin']);
      setAllowed(ok);
      if (!ok) {
        setErr(t.admin.forbiddenReason ?? 'No permission');
        return;
      }
      const supabase = getSupabase();
      if (!supabase) {
        setRows(SEED_AUDIT);
        return;
      }
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        setErr(error.message);
        return;
      }
      setRows((data as AuditRow[]) ?? []);
    })();
  }, [t.admin.forbiddenReason]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (resourceFilter && !r.resource.includes(resourceFilter)) return false;
      if (actorFilter && !(r.actor_email ?? '').includes(actorFilter)) return false;
      return true;
    });
  }, [rows, resourceFilter, actorFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = slicePage(filtered, safePage, PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [resourceFilter, actorFilter]);

  if (allowed === false) {
    return (
      <div className="px-5 py-8">
        <div className="max-w-shell mx-auto bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-[13px] rounded">
          {err}
        </div>
      </div>
    );
  }

  const exportCsv = () => {
    const headers = [
      t.admin.auditColTime ?? 'Time',
      t.admin.auditColActor ?? 'Actor',
      t.admin.auditColAction ?? 'Action',
      t.admin.auditColResource ?? 'Resource',
      t.admin.auditColDiff ?? 'Diff',
    ];
    const body = filtered.map((r) => [
      new Date(r.created_at).toLocaleString(),
      r.actor_email ?? '',
      r.action,
      r.resource_id ? `${r.resource}#${r.resource_id}` : r.resource,
      summarize(r.before, r.after),
    ]);
    downloadAdminCSV(csvFilename('admin-audit'), toAdminCSV(headers, body));
  };

  return (
    <div className="px-5 py-6">
      <div className="max-w-shell mx-auto">
        <h1 className="text-[20px] font-bold text-neutral-800 mb-1">{t.admin.auditTitle ?? 'Audit log'}</h1>
        <p className="text-[12.5px] text-neutral-500 mb-5">{t.admin.auditSubtitle ?? 'Last 100 admin actions. Super admin only.'}</p>

        <AdminToolbar
          label={t.admin.auditTitle ?? 'Audit log'}
          searchPlaceholder={t.admin.auditFilterResource ?? 'Filter by resource (orders/products/...)'}
          searchAriaLabel={t.admin.auditFilterResource ?? 'Filter by resource'}
          search={resourceFilter}
          onSearchChange={setResourceFilter}
          resultCount={filtered.length}
          totalCount={rows?.length ?? 0}
          onExport={exportCsv}
          exportLabel={t.admin.exportCsv ?? 'Export CSV'}
          page={safePage}
          pageCount={pageCount}
          onPageChange={setPage}
          paginationLabels={{
            prev: t.admin.pagePrev ?? 'Prev',
            next: t.admin.pageNext ?? 'Next',
            page: t.admin.pageIndicator ?? 'Page {current} of {total}',
            current: safePage,
            total: pageCount,
          }}
        >
          <div className="flex items-center gap-1.5">
            <label htmlFor="audit-actor-filter" className="text-[12px] text-neutral-500 whitespace-nowrap">
              {t.admin.auditFilterActor ?? 'Filter by actor email'}
            </label>
            <input
              id="audit-actor-filter"
              type="search"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder={t.admin.auditFilterActor ?? 'Filter by actor email'}
              className="w-[220px] px-3 py-1.5 border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </AdminToolbar>

        {rows === null ? (
          <div className="text-neutral-500 text-[13px]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-neutral-500 text-[13px]">
            {t.admin.auditEmpty ?? 'No actions yet.'}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-left">
                  <th className="px-3 py-2.5 font-medium">{t.admin.auditColTime ?? 'Time'}</th>
                  <th className="px-3 py-2.5 font-medium">{t.admin.auditColActor ?? 'Actor'}</th>
                  <th className="px-3 py-2.5 font-medium">{t.admin.auditColAction ?? 'Action'}</th>
                  <th className="px-3 py-2.5 font-medium">{t.admin.auditColResource ?? 'Resource'}</th>
                  <th className="px-3 py-2.5 font-medium">{t.admin.auditColDiff ?? 'Diff'}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                    <td className="px-3 py-2 text-neutral-600 whitespace-nowrap font-mono">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      {r.actor_email ?? '—'}
                      {r.actor_role && (
                        <span className="ml-1 text-[11px] text-neutral-400">({r.actor_role})</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-orange-700">{r.action}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[12px]">{r.resource}</span>
                      {r.resource_id && (
                        <span className="ml-2 text-neutral-500 font-mono text-[11.5px]">
                          #{r.resource_id}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-600 font-mono text-[11.5px] max-w-[320px] truncate">
                      {summarize(r.before, r.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function summarize(before: unknown, after: unknown): string {
  if (after === null || after === undefined) return '—';
  if (typeof after !== 'object') return String(after);
  const keys = Object.keys(after as Record<string, unknown>).slice(0, 4);
  return keys.map((k) => {
    const v = (after as Record<string, unknown>)[k];
    if (v === null || v === undefined) return null;
    return `${k}=${typeof v === 'object' ? JSON.stringify(v).slice(0, 24) : String(v).slice(0, 24)}`;
  }).filter(Boolean).join(', ');
}
