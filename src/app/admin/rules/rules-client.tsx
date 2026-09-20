'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { DEFAULT_RULES } from '@/lib/admin/fixtures';

export function RulesClient() {
  const t = useT();
  const [stored, setStored, mounted] = useAdminStore('rules');
  const [local, setLocal] = useState<typeof DEFAULT_RULES>(DEFAULT_RULES);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (mounted) setLocal(stored);
  }, [mounted, stored]);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const save = () => {
    setStored(local);
    setMsg(t.admin.saved);
    setTimeout(() => setMsg(''), 1800);
  };

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[20px] font-extrabold text-neutral-900 mb-3">{t.admin.rules.title}</h1>
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.mode}</label>
          <input value={t.admin.rules.modeVal} disabled className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] bg-neutral-50" />
        </div>
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.ownRate}</label>
          <input
            type="number"
            value={local.rates[0] ?? 0}
            onChange={(e) => setLocal({ ...local, rates: [Number(e.target.value), ...local.rates.slice(1)] })}
            className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.minWd}</label>
          <input
            type="number"
            value={local.min_withdraw}
            onChange={(e) => setLocal({ ...local, min_withdraw: Number(e.target.value) })}
            className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.rules.fee}</label>
          <input
            type="number"
            value={local.withdraw_fee}
            onChange={(e) => setLocal({ ...local, withdraw_fee: Number(e.target.value) })}
            className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]"
          />
        </div>
        <div className="pt-2 space-y-2">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={local.commission_on} onChange={(e) => setLocal({ ...local, commission_on: e.target.checked })} />
            {t.admin.rules.commissionOn}
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={local.auto_approve} onChange={(e) => setLocal({ ...local, auto_approve: e.target.checked })} />
            {t.admin.rules.autoApprove}
          </label>
        </div>
        <p className="text-[12px] text-neutral-500">{t.admin.rules.hint}</p>
        <button onClick={save} className="px-4 py-2 rounded-md bg-orange-600 text-white font-bold text-[13px] hover:bg-orange-700">
          {t.admin.rules.saveAll}
        </button>
        {msg && <div className="text-emerald-600 text-[12.5px]">{msg}</div>}
      </div>
    </div>
  );
}