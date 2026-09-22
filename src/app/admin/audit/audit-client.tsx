'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/use-t';
import { getSupabase } from '@/lib/api/supabase-client';
import { hasRole } from '@/lib/admin/rbac';

/**
 * /admin/audit — super_admin only.
 *
 * Reads public.audit_log via Supabase (RLS gated to super_admin).
 * Shows latest 100 entries; client-side filter by resource + actor.
 */

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

export function AuditClient() {
  const t = useT();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const ok = await hasRole(['super_admin']);
      setAllowed(ok);
      if (!ok) {
        setErr(t.admin.forbiddenReason ?? 'No permission');
        return;
      }
      const supabase = getSupabase();
      if (!supabase) {
        setRows([]);
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

  if (allowed === false) {
    return (
      <div className="px-5 py-8">
        <div className="max-w-shell mx-auto bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-[13px] rounded">
          {err}
        </div>
      </div>
    );
  }

  const filtered = (rows ?? []).filter((r) => {
    if (resourceFilter && !r.resource.includes(resourceFilter)) return false;
    if (actorFilter && !(r.actor_email ?? '').includes(actorFilter)) return false;
    return true;
  });

  return (
    <div className="px-5 py-6">
      <div className="max-w-shell mx-auto">
        <h1 className="text-[20px] font-bold text-neutral-800 mb-1">{t.admin.auditTitle ?? 'Audit log'}</h1>
        <p className="text-[12.5px] text-neutral-500 mb-5">{t.admin.auditSubtitle ?? 'Last 100 admin actions. Super admin only.'}</p>

        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            placeholder={t.admin.auditFilterResource ?? 'Filter by resource (orders/products/...)'}
            className="px-3 py-2 border border-neutral-200 rounded-md text-[13px] w-[260px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            aria-label={t.admin.auditFilterResource ?? 'Filter by resource'}
          />
          <input
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder={t.admin.auditFilterActor ?? 'Filter by actor email'}
            className="px-3 py-2 border border-neutral-200 rounded-md text-[13px] w-[240px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            aria-label={t.admin.auditFilterActor ?? 'Filter by actor'}
          />
          <div className="ml-auto text-[12.5px] text-neutral-500 self-center">
            {filtered.length} / {rows?.length ?? 0}
          </div>
        </div>

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
                {filtered.map((r) => (
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
