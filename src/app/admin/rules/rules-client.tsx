'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { DEFAULT_RULES } from '@/lib/admin/fixtures';
import { isSupabaseConfigured } from '@/lib/api';
import { fetchAllConfig, saveConfigAll } from '@/lib/api/admin-config-api';

const BTN_SAVE = 'px-4 py-2 rounded-md bg-orange-700 text-white font-bold text-[13px] hover:bg-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 transition-colors disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:hover:bg-neutral-200';
const INPUT_BASE = 'w-full border rounded px-2 py-1.5 text-[13px] bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1';

// Stable signature for comparison (deep-equal on the editable fields only).
function signature(r: typeof DEFAULT_RULES): string {
  return JSON.stringify({
    rates: r.rates[0],
    min_withdraw: r.min_withdraw,
    withdraw_fee: r.withdraw_fee,
    commission_on: r.commission_on,
    auto_approve: r.auto_approve,
  });
}

function validate(local: typeof DEFAULT_RULES, t: any): string | null {
  const rate = Number(local.rates[0] ?? 0);
  const fee = Number(local.withdraw_fee);
  const min = Number(local.min_withdraw);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return t.admin.rules.rangeErr;
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) return t.admin.rules.rangeErr;
  if (!Number.isFinite(min) || min < 0) return t.admin.rules.minWdErr;
  return null;
}

export function RulesClient() {
  const t = useT();
  const [stored, setStored, mounted] = useAdminStore('rules');
  const [local, setLocal] = useState<typeof DEFAULT_RULES>(DEFAULT_RULES);

  // Phase 1.1.8 — hydrate from Supabase config_kv on mount.
  useEffect(() => {
    if (!mounted || !isSupabaseConfigured()) return;
    let cancelled = false;
    void fetchAllConfig().then((cfg) => {
      if (cancelled || !cfg) return;
      setStored(cfg.rules);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, setStored]);

  // Toast — single-flight 3s; replaces the inline <div> msg from v1.
  const [toast, setToast] = useState<{ kind: 'success' | 'info' | 'danger'; text: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);
  const showToast = (kind: 'success' | 'info' | 'danger', text: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ kind, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  // Error per field — same role/aria pattern as wd reject-reason.
  const [errors, setErrors] = useState<{ rate?: string; fee?: string; min?: string }>({});

  useEffect(() => {
    if (mounted) setLocal(stored);
  }, [mounted, stored]);

  const dirty = useMemo(() => mounted && signature(local) !== signature(stored), [local, stored, mounted]);
  const errMsg = validate(local, t);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const save = () => {
    if (errMsg) {
      // surface per-field; for simplicity set all related ones to the same msg
      setErrors({ rate: errMsg === t.admin.rules.rangeErr ? errMsg : undefined, fee: errMsg === t.admin.rules.rangeErr ? errMsg : undefined, min: errMsg === t.admin.rules.minWdErr ? errMsg : undefined });
      showToast('danger', errMsg);
      return;
    }
    if (!dirty) {
      showToast('info', t.admin.rules.noChanges);
      return;
    }
    setErrors({});
    setStored(local);
    showToast('success', t.admin.rules.savedToast);
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className="max-w-[560px]">
      <PageBanner title={t.admin.rules.title} accent="emerald" />

      {dirty && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium rounded-md bg-amber-50 border border-amber-200 text-amber-800"
        >
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {t.admin.rules.unsaved}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <div>
          <label htmlFor="rule-mode" className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.mode}</label>
          <input id="rule-mode" value={t.admin.rules.modeVal} disabled className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] bg-neutral-50 text-neutral-500" />
        </div>
        <div>
          <label htmlFor="rule-own-rate" className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.ownRate}</label>
          <input
            id="rule-own-rate"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={local.rates[0] ?? 0}
            onChange={(e) => {
              setLocal({ ...local, rates: [Number(e.target.value), ...local.rates.slice(1)] });
              if (errors.rate) setErrors((er) => ({ ...er, rate: undefined }));
            }}
            onKeyDown={onEnter}
            aria-invalid={!!errors.rate}
            aria-describedby={errors.rate ? 'rule-rate-err' : undefined}
            className={`${INPUT_BASE} ${errors.rate ? 'border-rose-500 bg-rose-50' : 'border-neutral-200'}`}
          />
          {errors.rate && <p id="rule-rate-err" role="alert" className="mt-1 text-[11.5px] text-rose-600 font-medium">{errors.rate}</p>}
        </div>
        <div>
          <label htmlFor="rule-min-wd" className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.minWd}</label>
          <input
            id="rule-min-wd"
            type="number"
            min={0}
            step="0.01"
            value={local.min_withdraw}
            onChange={(e) => {
              setLocal({ ...local, min_withdraw: Number(e.target.value) });
              if (errors.min) setErrors((er) => ({ ...er, min: undefined }));
            }}
            onKeyDown={onEnter}
            aria-invalid={!!errors.min}
            aria-describedby={errors.min ? 'rule-min-err' : undefined}
            className={`${INPUT_BASE} ${errors.min ? 'border-rose-500 bg-rose-50' : 'border-neutral-200'}`}
          />
          {errors.min && <p id="rule-min-err" role="alert" className="mt-1 text-[11.5px] text-rose-600 font-medium">{errors.min}</p>}
        </div>
        <div>
          <label htmlFor="rule-fee" className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.fee}</label>
          <input
            id="rule-fee"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={local.withdraw_fee}
            onChange={(e) => {
              setLocal({ ...local, withdraw_fee: Number(e.target.value) });
              if (errors.fee) setErrors((er) => ({ ...er, fee: undefined }));
            }}
            onKeyDown={onEnter}
            aria-invalid={!!errors.fee}
            aria-describedby={errors.fee ? 'rule-fee-err' : undefined}
            className={`${INPUT_BASE} ${errors.fee ? 'border-rose-500 bg-rose-50' : 'border-neutral-200'}`}
          />
          {errors.fee && <p id="rule-fee-err" role="alert" className="mt-1 text-[11.5px] text-rose-600 font-medium">{errors.fee}</p>}
        </div>
        <div className="pt-2 space-y-2">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={local.commission_on} onChange={(e) => setLocal({ ...local, commission_on: e.target.checked })} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1" />
            {t.admin.rules.commissionOn}
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={local.auto_approve} onChange={(e) => setLocal({ ...local, auto_approve: e.target.checked })} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1" />
            {t.admin.rules.autoApprove}
          </label>
        </div>
        <p className="text-[12px] text-neutral-500">{t.admin.rules.hint}</p>
        <button type="button" onClick={save} disabled={!dirty} className={BTN_SAVE}>
          {t.admin.rules.saveAll}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role={toast.kind === 'danger' ? 'alert' : 'status'}
          aria-live={toast.kind === 'danger' ? 'assertive' : 'polite'}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-[13px] rounded-lg shadow-lg text-white ${
            toast.kind === 'success' ? 'bg-emerald-700'
            : toast.kind === 'danger' ? 'bg-rose-700'
            : 'bg-neutral-900'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
