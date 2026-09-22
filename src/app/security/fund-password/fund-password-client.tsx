'use client';

import { useState } from 'react';
import { PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import { getFundPassword, setFundPassword } from '@/lib/fund-password';

/**
 * /security/fund-password — 6-digit numeric fund password (withdraw
 * authorization). Split out from /profile to match the source site's left
 * rail nav.
 *
 * Phase 1.5: writes through to localStorage via the fund-password lib so
 * /withdraw's verifyFundPassword() reads the new value. Server-side
 * bcrypt lands in Phase 2.6 once supabase functions are live.
 */
export default function FundPasswordClient() {
  const t = useT();
  const chrome = usePageChrome('profile');
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const submit = () => {
    if (!/^\d{6}$/.test(n1)) {
      setMsg({ kind: 'error', text: t.security.pwdTooShort });
      return;
    }
    if (n1 !== n2) {
      setMsg({ kind: 'error', text: t.security.pwdMismatch });
      return;
    }
    // Verify the current password matches before allowing a change.
    if (cur && cur !== getFundPassword()) {
      setMsg({ kind: 'error', text: t.security.currentPasswordWrong ?? '当前密码不正确' });
      return;
    }
    const res = setFundPassword(n1);
    if (!res.ok) {
      setMsg({ kind: 'error', text: t.security.pwdTooShort });
      return;
    }
    setMsg({ kind: 'ok', text: t.security.savedOk });
    setCur('');
    setN1('');
    setN2('');
    setTimeout(() => setMsg(null), 1800);
  };

  return (
    <>
      <PageBanner
        title={t.security.changeFundPassword}
        subtitle={chrome.isEn
          ? 'Six-digit PIN used for withdrawals'
          : '六位数字密码,用于提现授权'}
      />

      <section className="bg-white border border-ink-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h2 className="text-[12px] font-bold text-ink-900">
            {chrome.isEn ? 'Update fund PIN' : '更新资金密码'}
          </h2>
        </div>
        <div className="p-5 space-y-4 max-w-[640px]">
          <label className="block">
            <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">
              {t.security.currentPassword}
            </span>
            <input
              type="password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">
              {t.security.newPassword}
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={n1}
              onChange={(e) => setN1(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] font-mono tracking-widest outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">
              {t.security.confirmPassword}
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={n2}
              onChange={(e) => setN2(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] font-mono tracking-widest outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          {msg && (
            <div
              role={msg.kind === 'ok' ? 'status' : 'alert'}
              className={
                'px-3 py-2 rounded-md text-[12.5px] border ' +
                (msg.kind === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800')
              }
            >
              {msg.kind === 'ok' ? '✓ ' : '⚠ '}{msg.text}
            </div>
          )}
          <button
            type="button"
            onClick={submit}
            className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13.5px] font-bold rounded-md transition-colors"
          >
            {t.security.save}
          </button>
        </div>
      </section>
    </>
  );
}
