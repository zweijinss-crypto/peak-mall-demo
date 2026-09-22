'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';
import { isSupabaseConfigured } from '@/lib/api';
import { setAgentRates } from '@/lib/api/admin-agents-api';

type DraftRow = { own_rate: string; sub_rate: string; sub_rate_limit: string };

const EMPTY_DRAFT: DraftRow = { own_rate: '', sub_rate: '', sub_rate_limit: '' };

function draftFromAgent(a: any): DraftRow {
  return {
    own_rate: String(a.own_rate),
    sub_rate: String(a.sub_rate),
    sub_rate_limit: String(a.sub_rate_limit),
  };
}

function snapshotDraft(a: any): DraftRow {
  return {
    own_rate: String(a.own_rate),
    sub_rate: String(a.sub_rate),
    sub_rate_limit: String(a.sub_rate_limit),
  };
}

function isDirty(d: DraftRow, a: any): boolean {
  return d.own_rate !== String(a.own_rate)
    || d.sub_rate !== String(a.sub_rate)
    || d.sub_rate_limit !== String(a.sub_rate_limit);
}

function validate(d: DraftRow, t: any): string | null {
  const own = Number(d.own_rate);
  const sub = Number(d.sub_rate);
  const lim = Number(d.sub_rate_limit);
  if ([own, sub, lim].some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
    return t.admin.agents.rangeErr;
  }
  if (sub > lim) {
    return 'sub_rate must be ≤ sub_rate_limit';
  }
  return null;
}

export function AgentsClient() {
  const t = useT();
  const [agents, setAgents, mounted] = useAdminStore('agents');
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [errorFor, setErrorFor] = useState<{ id: number; msg: string } | null>(null);

  // Undo toast state.
  const [undo, setUndo] = useState<{ id: number; prev: any; timer: number } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [undone, setUndone] = useState(false);
  const undoneTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    if (undoneTimerRef.current !== null) window.clearTimeout(undoneTimerRef.current);
  }, []);

  // Initialize drafts when mounted/agents change.
  useEffect(() => {
    if (!mounted) return;
    setDrafts((prev) => {
      const next: Record<number, DraftRow> = {};
      for (const a of agents as any[]) {
        next[a.id] = prev[a.id] ?? draftFromAgent(a);
      }
      return next;
    });
  }, [mounted, agents]);

  const setDraft = useCallback((id: number, field: keyof DraftRow, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_DRAFT), [field]: value } }));
    if (errorFor?.id === id) setErrorFor(null);
  }, [errorFor]);

  const save = useCallback((id: number) => {
    const a = (agents as any[]).find((x) => x.id === id);
    if (!a) return;
    const draft = drafts[id];
    if (!draft) return;

    const err = validate(draft, t);
    if (err) {
      setErrorFor({ id, msg: err });
      return;
    }

    const snapshot = { ...a };
    const updated = {
      ...a,
      own_rate: Number(draft.own_rate),
      sub_rate: Number(draft.sub_rate),
      sub_rate_limit: Number(draft.sub_rate_limit),
    };

    setAgents((agents as any[]).map((x) => (x.id === id ? updated : x)));

    // Phase 1.1.8 — persist rates to public.users.agent_config.
    // Fire-and-forget: setAgents already wrote the local optimistic state.
    if (isSupabaseConfigured()) {
      void setAgentRates(id, {
        own_rate: updated.own_rate,
        sub_rate: updated.sub_rate,
        sub_rate_limit: updated.sub_rate_limit,
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[admin/agents] persist failed:', err);
      });
    }

    // mark saved (3s green check)
    setSavedIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);

    // schedule undo (5s)
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const timer = window.setTimeout(() => setUndo(null), 5000);
    undoTimerRef.current = timer;
    setUndo({ id, prev: snapshot, timer });
  }, [agents, drafts, t, setAgents]);

  const undoSave = useCallback(() => {
    if (!undo) return;
    const { id, prev } = undo;
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    setAgents((agents as any[]).map((x) => (x.id === id ? prev : x)));
    setDrafts((d) => ({ ...d, [id]: snapshotDraft(prev) }));
    setSavedIds(new Set());
    setUndo(null);

    // show "undone" toast
    setUndone(true);
    if (undoneTimerRef.current !== null) window.clearTimeout(undoneTimerRef.current);
    undoneTimerRef.current = window.setTimeout(() => setUndone(false), 2500);
  }, [undo, agents, setAgents]);

  const copyAddress = useCallback(async (id: number, addr: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(addr);
      } else {
        const ta = document.createElement('textarea');
        ta.value = addr;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch (e) {
      // Last-resort fallback: show address in prompt so user can copy manually.
      // We use a modal-less prompt; if blocked, at least user sees the address.
      try { window.prompt(t.admin.agents.copyAddress, addr); }
      catch { /* ignore */ }
    }
  }, [t.admin.agents.copyAddress]);

  const dirtyCount = (agents as any[]).filter((a) => drafts[a.id] && isDirty(drafts[a.id], a)).length;

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  return (
    <div>
      <PageBanner title={t.admin.agents.title} accent="emerald" />
      <p className="text-[12.5px] text-neutral-500 mb-4 leading-relaxed">{t.admin.agents.hint}</p>

      {dirtyCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium rounded-md bg-amber-50 border border-amber-200 text-amber-800"
        >
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {dirtyCount} {t.admin.agents.colAction === '操作' ? '行未保存' : 'row(s) unsaved'}
        </div>
      )}

      <DataTable minWidth="780px">
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
            (agents as any[]).map((a) => {
              const d = drafts[a.id] ?? draftFromAgent(a);
              const dirty = isDirty(d, a);
              const saved = savedIds.has(a.id);
              const errMsg = errorFor && errorFor.id === a.id ? errorFor.msg : null;
              return (
                <tr key={a.id} className={`transition-colors ${dirty ? 'bg-amber-50/40' : 'hover:bg-neutral-50'}`}>
                  <Td>{a.id}</Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{a.nickname}</span>
                      <span className="text-[11.5px] text-neutral-500">@{a.username}</span>
                    </div>
                  </Td>
                  <Td className="font-bold tabular-nums">{usd(a.balance)}</Td>
                  <Td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      aria-label={`${t.admin.agents.colOwn} ${a.username}`}
                      value={d.own_rate}
                      onChange={(e) => setDraft(a.id, 'own_rate', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(a.id); } }}
                      className={`border rounded px-1.5 py-1 w-[72px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${dirty ? 'border-amber-400 bg-white' : 'border-neutral-200 bg-white'}`}
                    />
                    <span className="ml-1 text-neutral-500 text-[12px]">%</span>
                  </Td>
                  <Td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      aria-label={`${t.admin.agents.colSub} ${a.username}`}
                      value={d.sub_rate}
                      onChange={(e) => setDraft(a.id, 'sub_rate', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(a.id); } }}
                      className={`border rounded px-1.5 py-1 w-[72px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${dirty ? 'border-amber-400 bg-white' : 'border-neutral-200 bg-white'}`}
                    />
                    <span className="ml-1 text-neutral-500 text-[12px]">%</span>
                  </Td>
                  <Td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      aria-label={`${t.admin.agents.colLimit} ${a.username}`}
                      value={d.sub_rate_limit}
                      onChange={(e) => setDraft(a.id, 'sub_rate_limit', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(a.id); } }}
                      className={`border rounded px-1.5 py-1 w-[72px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${dirty ? 'border-amber-400 bg-white' : 'border-neutral-200 bg-white'}`}
                    />
                    <span className="ml-1 text-neutral-500 text-[12px]">%</span>
                  </Td>
                  <Td className="max-w-[200px]">
                    {a.withdraw_address ? (
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11.5px] font-mono text-neutral-700 truncate max-w-[140px]" title={a.withdraw_address}>{a.withdraw_address}</code>
                        <button
                          type="button"
                          onClick={() => copyAddress(a.id, a.withdraw_address)}
                          aria-label={`${t.admin.agents.copyAddress} ${a.username}`}
                          className="shrink-0 px-1.5 py-0.5 text-[10.5px] font-medium rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 transition-colors"
                        >
                          {copiedId === a.id ? t.admin.agents.copied : t.admin.agents.copyAddress}
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(a.id)}
                        disabled={!dirty}
                        aria-label={`${t.admin.agents.save} ${a.username}`}
                        className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${dirty ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
                      >
                        {saved ? `✓ ${t.admin.agents.saved}` : t.admin.agents.save}
                      </button>
                      {errMsg && (
                        <span role="alert" className="text-[11px] text-rose-600 max-w-[120px] truncate" title={errMsg}>{errMsg}</span>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>

      {/* Undo toast */}
      {undo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-neutral-900 text-white text-[13px] rounded-lg shadow-lg"
        >
          <span>{t.admin.agents.savedToast.replace('{id}', String(undo.id))}</span>
          <button
            type="button"
            onClick={undoSave}
            className="px-2.5 py-1 text-[12px] font-bold rounded bg-amber-400 text-neutral-900 hover:bg-amber-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {t.admin.agents.undoCta}
          </button>
        </div>
      )}

      {/* Undone toast */}
      {undone && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-700 text-white text-[13px] rounded-lg shadow-lg"
        >
          {t.admin.agents.undoneToast}
        </div>
      )}
    </div>
  );
}
