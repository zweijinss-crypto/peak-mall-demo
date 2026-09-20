'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { DEFAULT_SUPPORT } from '@/lib/admin/fixtures';

export function SupportClient() {
  const t = useT();
  const [stored, setStored, mounted] = useAdminStore('supportCfg');
  const [local, setLocal] = useState(DEFAULT_SUPPORT);
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
      <PageBanner title={t.admin.support.title} accent="emerald" />
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <div>
          <label htmlFor="sp-name" className="block text-[12px] text-neutral-600 mb-1">{t.admin.support.name}</label>
          <input id="sp-name" value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]" />
        </div>
        <div>
          <label htmlFor="sp-url" className="block text-[12px] text-neutral-600 mb-1">{t.admin.support.url}</label>
          <input id="sp-url" value={local.url} onChange={(e) => setLocal({ ...local, url: e.target.value })} placeholder={t.admin.support.phUrl} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]" />
          <div className="text-[11.5px] text-neutral-500 mt-1">{t.admin.support.hintUrl}</div>
        </div>
        <div>
          <label htmlFor="sp-hours" className="block text-[12px] text-neutral-600 mb-1">{t.admin.support.hours}</label>
          <input id="sp-hours" value={local.hours} onChange={(e) => setLocal({ ...local, hours: e.target.value })} placeholder={t.admin.support.phHours} className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px]" />
          <div className="text-[11.5px] text-neutral-500 mt-1">{t.admin.support.hintHours}</div>
        </div>
        <button onClick={save} className="px-4 py-2 rounded-md bg-orange-700 text-white font-bold text-[13px] hover:bg-orange-700">{t.admin.support.save}</button>
        {msg && <div className="text-emerald-600 text-[12.5px]">{msg}</div>}
      </div>
      <h2 className="text-[14px] font-bold text-neutral-900 mt-5 mb-2">{t.admin.support.preview}</h2>
      <div className="bg-white rounded-xl border border-neutral-200 p-4 inline-flex items-center gap-3">
        <span aria-hidden="true" className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-[12px] font-extrabold flex items-center justify-center flex-shrink-0">MC</span>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-bold text-neutral-900">{local.name || 'Support'}</span>
          {local.hours && <span className="text-[11px] text-neutral-500">🕐 {local.hours}</span>}
        </div>
        <a href={local.url || '#'} target="_blank" rel="noopener noreferrer" className="ml-2 px-2.5 py-1 bg-neutral-900 text-white text-[10.5px] font-extrabold tracking-wide rounded hover:bg-orange-700">SEND</a>
      </div>
    </div>
  );
}