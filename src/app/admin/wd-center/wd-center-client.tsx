'use client';

import { useState, useMemo, useEffect } from 'react';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd, wdStatusLabel, type WdStatus } from '@/lib/admin/fixtures';

type Tab = 'all' | WdStatus;

const STATUS_CLASS: Record<WdStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

/**
 * Pick a current "logged-in" demo user from the users list. Pure client —
 * no auth yet, so we default to the user with the highest balance to make
 * the demo feel less empty. Persisted in localStorage so the choice
 * survives reloads.
 */
const DEMO_USER_KEY = 'peakMall.demoWdUserId';
function pickDefaultUserId(users: Array<{ id: number; balance: number }>): number {
  if (typeof window === 'undefined') return users[0]?.id ?? 1;
  const saved = window.localStorage.getItem(DEMO_USER_KEY);
  if (saved) {
    const id = Number(saved);
    if (users.some((u) => u.id === id)) return id;
  }
  // Pick the user with the highest available balance.
  const richest = [...users].sort((a, b) => b.balance - a.balance)[0];
  return richest?.id ?? users[0]?.id ?? 1;
}

export function WdCenterClient() {
  const t = useT();
  const [wd, setWd, mounted, isEnPath] = useAdminStore('wd');
  const [users, , usersMounted] = useAdminStore('users');
  const [rules] = useAdminStore('rules');
  const [tab, setTab] = useState<Tab>('all');
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState<'usdt_trc20' | 'card'>('usdt_trc20');
  const [account, setAccount] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Resolve the current "logged-in" demo user once both stores are mounted.
  // useState's lazy initializer only fires once, but we need users data —
  // so we defer to a derived memo and seed localStorage here.
  const currentUser = useMemo(() => {
    if (!usersMounted || currentUserId === null) return null;
    return users.find((u: any) => u.id === currentUserId) ?? null;
  }, [usersMounted, currentUserId, users]);

  // After users load, if we haven't picked a user yet, pick one.
  // useEffect (not inline setState during render) so React doesn't warn.
  useEffect(() => {
    if (usersMounted && currentUserId === null) {
      setCurrentUserId(pickDefaultUserId(users));
    }
  }, [usersMounted, currentUserId, users]);

  if (!mounted || !usersMounted) {
    return <div className="text-neutral-500 text-[13px]">Loading…</div>;
  }

  const locale = isEnPath ? 'en' : 'zh';
  const filtered = tab === 'all' ? wd : wd.filter((w: any) => w.status === tab);
  const tabs: Array<[Tab, string]> = [
    ['all', t.admin.wdCenter.tabs.all],
    ['pending', t.admin.wdCenter.tabs.pending],
    ['approved', t.admin.wdCenter.tabs.approved],
    ['rejected', t.admin.wdCenter.tabs.rejected],
    ['paid', t.admin.wdCenter.tabs.paid],
  ];

  // Fee and minimum withdrawal are sourced from the admin/rules store so
  // they stay in sync with whatever ops configured under /admin/rules.
  // rules.withdraw_fee is a percentage (e.g. 2 means 2%); rules.min_withdraw
  // is the absolute floor in USD.
  const feePct = Number(rules?.withdraw_fee ?? 2);
  const minWd = Number(rules?.min_withdraw ?? 10);
  const feeRate = feePct / 100;

  const submit = () => {
    setMsg(null);
    if (!currentUser) {
      setMsg({ kind: 'err', text: isEnPath ? 'Pick a demo user first.' : '请先选择演示账号。' });
      return;
    }
    const v = Number(amt);
    if (!v || v < minWd) {
      setMsg({ kind: 'err', text: t.admin.wdCenter.applyFailMin });
      return;
    }
    if (v > currentUser.balance) {
      setMsg({ kind: 'err', text: t.admin.wdCenter.applyFailInsufficient });
      return;
    }
    const needsAddr = method === 'usdt_trc20';
    const finalAccount = needsAddr ? account.trim() : currentUser.username;
    if (needsAddr && !finalAccount) {
      setMsg({ kind: 'err', text: t.admin.wdCenter.applyFailAddr });
      return;
    }
    // Match the bound_address convention so admin/agents can verify it.
    const bound = currentUser.withdraw_address ?? '';
    const mismatch = needsAddr && bound && finalAccount !== bound;
    const fee = +(v * feeRate).toFixed(2);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const nextId = wd.length === 0 ? 1 : Math.max(...wd.map((w: any) => w.id)) + 1;
    const newRow = {
      id: nextId,
      user_id: currentUser.id,
      username: currentUser.username,
      amount: v,
      fee,
      method,
      account: finalAccount,
      bound_address: bound,
      status: 'pending' as const,
      reject_reason: '',
      created_at: now,
      mismatch,
    };
    setWd([newRow, ...wd]);
    setMsg({ kind: 'ok', text: `${t.admin.wdCenter.submitted} #${nextId} · ${t.admin.wdCenter.applySuccess}` });
    setAmt('');
    setAccount('');
  };

  const switchUser = (id: number) => {
    setCurrentUserId(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEMO_USER_KEY, String(id));
    }
    setMsg(null);
  };

  return (
    <div>
      <PageBanner title={t.admin.wdCenter.title} accent="emerald" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-neutral-900">{t.admin.wdCenter.apply}</h2>
            <span className="text-[11px] text-neutral-500">
              {t.admin.wdCenter.currentUserLabel}: <span className="font-bold text-neutral-700">@{currentUser?.username ?? '—'}</span>
            </span>
          </div>

          {/* Demo user switcher — 3 users with different balances so the demo is interactive. */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {users.slice(0, 4).map((u: any) => (
              <button
                key={u.id}
                type="button"
                onClick={() => switchUser(u.id)}
                className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                  u.id === currentUserId
                    ? 'bg-orange-700 text-white border-orange-700'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                @{u.username} · ${u.balance.toFixed(2)}
              </button>
            ))}
          </div>

          <label className="block text-[12px] text-neutral-600 mb-1">{t.admin.wdCenter.balance}</label>
          <div className="text-[22px] font-extrabold text-orange-600 mb-3">
            {currentUser ? usd(currentUser.balance) : '—'}
          </div>

          <label htmlFor="wd-amt" className="block text-[12px] text-neutral-600 mb-1">{t.admin.wdCenter.colAmt}</label>
          <input
            id="wd-amt"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] mb-3"
          />

          <label htmlFor="wd-method" className="block text-[12px] text-neutral-600 mb-1">{t.admin.wdCenter.colMethod}</label>
          <select
            id="wd-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] mb-3"
          >
            <option value="usdt_trc20">USDT-TRC20</option>
            <option value="card">Card</option>
          </select>

          {method === 'usdt_trc20' && (
            <>
              <label htmlFor="wd-account" className="block text-[12px] text-neutral-600 mb-1">
                {t.admin.wdCenter.accountLabel}
                {currentUser?.withdraw_address && (
                  <span className="ml-1 text-[10.5px] text-neutral-500">
                    ({t.admin.wd.unbound})
                  </span>
                )}
              </label>
              <input
                id="wd-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={
                  currentUser?.withdraw_address
                    ? currentUser.withdraw_address
                    : (t.admin.wdCenter.accountPh as string)
                }
                className="w-full border border-neutral-200 rounded px-2 py-1.5 text-[13px] mb-3 font-mono text-[12px]"
              />
            </>
          )}

          <p className="text-[11.5px] text-neutral-500 mb-3">
            {t.admin.wdCenter.min}: $10 · Fee 2%
          </p>
          <button
            type="button"
            onClick={submit}
            className="w-full py-2 rounded-md bg-orange-700 text-white font-bold text-[13px] hover:bg-orange-700 transition-colors"
          >
            {t.admin.wdCenter.apply}
          </button>
          {msg && (
            <div
              role={msg.kind === 'err' ? 'alert' : 'status'}
              className={`mt-2 text-[12.5px] font-medium ${
                msg.kind === 'ok' ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <div className="flex gap-3 border-b border-neutral-200 mb-3 overflow-x-auto">
            {tabs.map(([k, n]) => (
              <button key={k} onClick={() => setTab(k)} className={`pb-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${tab === k ? 'border-orange-600 text-orange-700' : 'border-transparent text-neutral-600 hover:text-neutral-900'}`}>{n}</button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[640px]">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colId}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colAmt}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colFee}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colMethod}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colAccount}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colStatus}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colReject}</th>
                  <th className="px-3 py-2 text-left">{t.admin.wdCenter.colTime}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-neutral-500 py-6">{t.admin.wdCenter.empty}</td></tr>
                ) : (
                  filtered.map((w: any) => (
                    <tr key={w.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="px-3 py-2 font-mono">#{w.id}</td>
                      <td className="px-3 py-2 font-bold tabular-nums">{usd(w.amount)}</td>
                      <td className="px-3 py-2 text-neutral-600">{usd(w.fee)}</td>
                      <td className="px-3 py-2">{w.method === 'usdt_trc20' ? 'USDT-TRC20' : w.method}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate text-[11px] font-mono">{w.account || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[w.status as WdStatus]}`}>{wdStatusLabel(w.status, locale as any)}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[180px] truncate text-[11px] text-rose-600">{w.reject_reason || '—'}</td>
                      <td className="px-3 py-2 text-[11px] text-neutral-500">{w.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
