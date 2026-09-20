'use client';

import { useState } from 'react';
import { useT } from '@/lib/use-t';

/**
 * /security/password — change login password (split out from /profile for
 * a 1:1 match with the source site's left-rail nav).
 */
export default function PasswordClient() {
  const t = useT();
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = () => {
    if (n1.length < 6) {
      setMsg(t.security.pwdTooShort);
      return;
    }
    if (n1 !== n2) {
      setMsg(t.security.pwdMismatch);
      return;
    }
    setMsg(t.security.savedOk);
    setCur('');
    setN1('');
    setN2('');
    setTimeout(() => setMsg(null), 1500);
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-[22px] font-extrabold text-ink-900">🔑 {t.security.changePassword}</h1>
        <p className="text-[13px] text-ink-600">{t.security.pwdIntro}</p>
      </header>

      <section className="bg-white rounded-xl border border-ink-100 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="block text-[12px] text-ink-700 font-medium">{t.security.currentPassword}</span>
            <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
          </label>
          <label className="space-y-1">
            <span className="block text-[12px] text-ink-700 font-medium">{t.security.newPassword}</span>
            <input type="password" value={n1} onChange={(e) => setN1(e.target.value)} className="w-full px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
          </label>
          <label className="space-y-1">
            <span className="block text-[12px] text-ink-700 font-medium">{t.security.confirmPassword}</span>
            <input type="password" value={n2} onChange={(e) => setN2(e.target.value)} className="w-full px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
          </label>
        </div>
        {msg && <div role="status" className="text-[12.5px] text-ink-700">{msg}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={submit} className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md focus-visible:ring-2 focus-visible:ring-orange-500">{t.security.save}</button>
        </div>
      </section>
    </div>
  );
}