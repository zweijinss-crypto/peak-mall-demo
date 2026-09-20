'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { DEFAULT_HOME } from '@/lib/admin/fixtures';

export function HomeClient() {
  const t = useT();
  const [stored, setStored, mounted] = useAdminStore('homeCfg');
  const [local, setLocal] = useState(DEFAULT_HOME);
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
    <div className="max-w-[640px]">
      <PageBanner title={t.admin.home.title} accent="emerald" />
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.home.heroTitle}</label>
          <input value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} placeholder={t.admin.home.phTitle} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]" />
        </div>
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.home.heroSub}</label>
          <input value={local.sub} onChange={(e) => setLocal({ ...local, sub: e.target.value })} placeholder={t.admin.home.phSub} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]" />
        </div>
        <div>
          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.home.notice}</label>
          <input value={local.notice} onChange={(e) => setLocal({ ...local, notice: e.target.value })} placeholder={t.admin.home.phNotice} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]" />
        </div>
        <p className="text-[12px] text-neutral-500">{t.admin.home.hint}</p>
        <button onClick={save} className="px-4 py-2 rounded-md bg-orange-700 text-white font-bold text-[13px] hover:bg-orange-700">{t.admin.home.save}</button>
        {msg && <div className="text-emerald-600 text-[12.5px]">{msg}</div>}
      </div>
      <h2 className="text-[14px] font-bold text-neutral-900 mt-5 mb-2">{t.admin.home.preview}</h2>
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="text-[28px] font-extrabold text-neutral-900">{local.title || t.admin.home.phTitle}</div>
        <div className="text-[14px] text-neutral-600 mt-1">{local.sub || t.admin.home.phSub}</div>
        {local.notice && (
          <div className="mt-4 inline-block bg-orange-50 border border-orange-100 text-orange-900 text-[12px] px-3 py-1.5 rounded">
            📣 {local.notice}
          </div>
        )}
      </div>
    </div>
  );
}