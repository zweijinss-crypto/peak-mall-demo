'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserShell, PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

interface WithdrawAddr { id: string; label: string; type: string; isDefault: boolean; address: string }
interface WithdrawRow {
  id: string;
  amount: number;
  addressLabel: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string; // ISO — static
  /** C3: optional timeline stamps (static for SSR-safe) */
  approvedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
}

/** C2: 手续费率 2%,最低手续费 $0.50,上限 $5.00 */
const FEE_RATE = 0.02;
const FEE_MIN = 0.50;
const FEE_MAX = 5.00;

function calcFee(amount: number): { fee: number; net: number } {
  if (!Number.isFinite(amount) || amount <= 0) return { fee: 0, net: 0 };
  const raw = amount * FEE_RATE;
  const fee = Math.min(FEE_MAX, Math.max(FEE_MIN, raw));
  const net = Math.max(0, amount - fee);
  return { fee, net };
}

/** Demo fund password — fixed 6-digit string for static demo.
 *  Real product would verify server-side via /api/auth/fund-password. */
const DEMO_FUND_PWD = '123456';

/** CSV escape — wrap in quotes when value contains comma, quote, or newline.
 *  Inner quotes doubled. */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const HISTORY: WithdrawRow[] = [
  { id: 'W1', amount: 100, addressLabel: 'USDT-TRC20-default', status: 'completed', createdAt: '2024-09-15T03:12:00.000Z', approvedAt: '2024-09-15T04:00:00.000Z', completedAt: '2024-09-15T05:30:00.000Z' },
  { id: 'W2', amount: 50,  addressLabel: 'USDT-TRC20-default', status: 'pending',   createdAt: '2024-09-19T07:42:00.000Z' },
  { id: 'W3', amount: 25,  addressLabel: 'Bank-ICBC',          status: 'rejected',  createdAt: '2024-09-08T11:24:00.000Z', rejectedAt: '2024-09-09T09:10:00.000Z', rejectReason: 'Bank account info mismatch' },
  { id: 'W4', amount: 200, addressLabel: 'BTC-Segwit-backup',  status: 'completed', createdAt: '2024-09-04T02:00:00.000Z', approvedAt: '2024-09-04T03:15:00.000Z', completedAt: '2024-09-04T08:00:00.000Z' },
  { id: 'W5', amount: 75,  addressLabel: 'Bank-CCB',           status: 'approved',  createdAt: '2024-09-02T11:30:00.000Z', approvedAt: '2024-09-02T13:00:00.000Z' },
  { id: 'W6', amount: 30,  addressLabel: 'USDT-TRC20-default', status: 'rejected',  createdAt: '2024-08-28T05:20:00.000Z', rejectedAt: '2024-08-28T06:45:00.000Z', rejectReason: 'Below minimum threshold' },
  { id: 'W7', amount: 60,  addressLabel: 'ETH-ERC20-default',  status: 'completed', createdAt: '2024-08-20T09:15:00.000Z', approvedAt: '2024-08-20T10:00:00.000Z', completedAt: '2024-08-20T14:30:00.000Z' },
];

const ADDR_KEY = 'peak_withdraw_addresses';

export default function WithdrawPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const router = useRouter();
  const chrome = usePageChrome('withdraw');
  const [addrs, setAddrs] = useState<WithdrawAddr[]>([]);
  const [amount, setAmount] = useState('');
  const [addrId, setAddrId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  /** C1: fund-password modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [fundPwd, setFundPwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdShake, setPwdShake] = useState(false);
  const pwdInputRef = useRef<HTMLInputElement | null>(null);

  /** C3: history filter + export */
  type WithdrawStatusTab = 'all' | WithdrawRow['status'];
  const [statusTab, setStatusTab] = useState<WithdrawStatusTab>('all');
  const [search, setSearch] = useState('');
  const [exportToast, setExportToast] = useState<string | null>(null);

  /** C2: live fee preview */
  const parsedAmount = Number(amount);
  const available = 21.50;
  const { fee, net } = useMemo(() => calcFee(parsedAmount), [parsedAmount]);
  const overBalance = parsedAmount > available;
  const belowMin = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount < 10;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDR_KEY);
      const arr = raw ? (JSON.parse(raw) as WithdrawAddr[]) : [];
      setAddrs(arr);
      const def = arr.find((a) => a.isDefault);
      if (def) setAddrId(def.id);
    } catch { /* ignore */ }
  }, []);
  const pending = 50;
  const withdrawn = 100;

  const STATUS_COLOR: Record<WithdrawRow['status'], string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-rose-100 text-rose-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  const STATUS_LABEL: Record<WithdrawRow['status'], string> = {
    pending: t.withdraw.statusPending,
    approved: t.withdraw.statusApproved,
    rejected: t.withdraw.statusRejected,
    completed: t.withdraw.statusCompleted,
  };

  /** C3: filter rows by status + search (id/address) */
  const filtered = useMemo(() => {
    let arr: WithdrawRow[] = HISTORY;
    if (statusTab !== 'all') arr = arr.filter((r) => r.status === statusTab);
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.addressLabel.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [statusTab, search]);

  const statusCounts = useMemo(() => {
    const acc: Record<WithdrawStatusTab, number> = {
      all: HISTORY.length,
      pending: 0, approved: 0, rejected: 0, completed: 0,
    };
    for (const r of HISTORY) acc[r.status]++;
    return acc;
  }, []);

  /** C3: export filtered rows to CSV */
  const handleExport = () => {
    const headers = [t.withdraw.date, 'id', t.withdraw.address, t.withdraw.amount, 'status'];
    const body = filtered.map((r) => [
      r.createdAt.slice(0, 10),
      r.id,
      r.addressLabel,
      `$${r.amount.toFixed(2)}`,
      STATUS_LABEL[r.status],
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`withdrawals-${stamp}.csv`, [headers, ...body]);
    setExportToast(t.withdraw.exported(filtered.length));
    window.setTimeout(() => setExportToast(null), 2000);
  };

  const openModal = () => {
    const n = Number(amount);
    if (!n || n < 10 || !addrId) return;
    if (n > available) return;
    setModalOpen(true);
    setFundPwd('');
    setPwdError(null);
    setPwdShake(false);
    // focus after paint
    setTimeout(() => pwdInputRef.current?.focus(), 50);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFundPwd('');
    setPwdError(null);
    setPwdShake(false);
  };

  const confirmWithdraw = () => {
    if (fundPwd !== DEMO_FUND_PWD) {
      setPwdError(t.withdraw.fundPwdWrong);
      setPwdShake(true);
      setTimeout(() => setPwdShake(false), 400);
      setFundPwd('');
      setTimeout(() => pwdInputRef.current?.focus(), 50);
      return;
    }
    setModalOpen(false);
    setSubmitted(true);
    setAmount('');
    setFundPwd('');
    setTimeout(() => setSubmitted(false), 2400);
  };

  return (
    <>

      <UserShell>
        <PageBanner
          title={t.withdraw.title}
          subtitle={chrome.isEn ? 'Apply for and track withdrawals' : '申请提现与查看历史'}
          stats={[
            { label: t.withdraw.available, value: `$${available.toFixed(2)}`, tone: 'accent' as const },
            { label: t.withdraw.pending, value: `$${pending.toFixed(2)}` },
            { label: t.withdraw.withdrawn, value: `$${withdrawn.toFixed(2)}` },
          ]}
        />

        {submitted && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[13px]">
            ✓ {t.withdraw.submitted}
          </div>
        )}

        <section className="bg-white rounded-xl border border-ink-100 p-6 mb-8 max-w-[640px]">
          <h2 className="text-[18px] font-bold text-ink-900 mb-4">{t.withdraw.apply}</h2>
          {addrs.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-[13px]">
              {t.withdraw.noAddress} <button onClick={() => router.push('/withdraw-address')} className="font-bold underline ml-1">{t.withdrawAddress.title}</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdraw.amount} *</span>
                  <input
                    type="number"
                    min={10}
                    max={available}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md text-[14px] outline-none focus:ring-2 ${
                      overBalance
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                        : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'
                    }`}
                    placeholder="50"
                  />
                  <span className="block text-[11.5px] text-ink-500 mt-1">{t.withdraw.minAmount}</span>
                </label>
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdraw.selectAddress} *</span>
                  <select
                    value={addrId}
                    onChange={(e) => setAddrId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                    aria-label={t.withdraw.selectAddress}
                  >
                    <option value="">—</option>
                    {addrs.map((a) => (
                      <option key={a.id} value={a.id}>{a.label} ({a.address.slice(0, 8)}…)</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* C2: 手续费预览 */}
              {parsedAmount > 0 && Number.isFinite(parsedAmount) && (
                <div
                  aria-live="polite"
                  className={`px-4 py-3 rounded-md border text-[13px] ${
                    overBalance || belowMin
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-ink-50 border-ink-100'
                  }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-ink-600">{t.withdraw.amount}</span>
                    <span className="font-bold tabular-nums text-ink-900">${parsedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-ink-600">{t.withdraw.fee} <span className="text-ink-400 text-[11.5px]">{t.withdraw.feeRate}</span></span>
                    <span className="font-bold tabular-nums text-rose-700">−${fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-ink-200 mt-1.5 pt-1.5 flex justify-between">
                    <span className="text-ink-700 font-semibold">{t.withdraw.actualReceive}</span>
                    <span className="font-extrabold tabular-nums text-emerald-700">${net.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-[11.5px] text-ink-500">{t.withdraw.feeHint}</p>
                  {overBalance && (
                    <p role="alert" className="mt-1.5 text-[12px] font-semibold text-rose-700">
                      ⚠ {t.withdraw.insufficientBalance} (${available.toFixed(2)})
                    </p>
                  )}
                  {belowMin && !overBalance && (
                    <p role="alert" className="mt-1.5 text-[12px] font-semibold text-rose-700">
                      ⚠ {t.withdraw.minAmount}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={openModal}
                disabled={!addrId || !Number.isFinite(parsedAmount) || parsedAmount < 10 || overBalance}
                className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[13.5px] font-bold rounded-md transition-colors"
              >
                {t.withdraw.apply}
              </button>
            </div>
          )}
        </section>

        {/* C1: 资金密码 modal */}
        {modalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fundPwdTitle"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-float">
              <h3 id="fundPwdTitle" className="text-[18px] font-extrabold text-ink-900 mb-1">
                🔒 {t.withdraw.fundPwdPrompt}
              </h3>
              <p className="text-[12.5px] text-ink-500 mb-5">{t.withdraw.fundPwdHint}</p>

              <label className="block mb-2">
                <span className="block text-[13px] text-ink-600 mb-1.5">Fund password</span>
                <input
                  ref={pwdInputRef}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={fundPwd}
                  onChange={(e) => {
                    setFundPwd(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setPwdError(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmWithdraw(); }}
                  placeholder="••••••"
                  aria-invalid={pwdError ? 'true' : 'false'}
                  aria-describedby={pwdError ? 'fundPwdErr' : undefined}
                  className={`w-full px-3 py-2.5 border-2 rounded-md text-[16px] font-mono tracking-[0.4em] outline-none text-center ${
                    pwdError
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50'
                      : 'border-ink-200 focus:border-orange-500'
                  } ${pwdShake ? 'animate-shake' : ''}`}
                />
              </label>

              {pwdError && (
                <p id="fundPwdErr" role="alert" className="text-[12px] text-rose-700 mb-3">
                  {pwdError}{' · '}
                  <a href="/security/fund-password" className="font-semibold underline">
                    {t.withdraw.fundPwdForgot}
                  </a>
                </p>
              )}
              {!pwdError && (
                <p className="text-[11.5px] text-ink-500 mb-3">
                  Demo: <span className="font-mono font-bold text-ink-700">{DEMO_FUND_PWD}</span>
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {t.withdraw.cancel}
                </button>
                <button
                  onClick={confirmWithdraw}
                  disabled={fundPwd.length !== 6}
                  className="flex-1 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {t.withdraw.confirm}
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-[18px] font-bold text-ink-900 mb-3">{t.withdraw.history}</h2>

        {/* C3: status tabs + search + export */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex flex-wrap gap-1 bg-ink-50 border border-ink-100 p-1 rounded-md">
            {([
              { key: 'all', label: t.withdraw.tabAll },
              { key: 'pending', label: t.withdraw.statusPending },
              { key: 'approved', label: t.withdraw.statusApproved },
              { key: 'rejected', label: t.withdraw.statusRejected },
              { key: 'completed', label: t.withdraw.statusCompleted },
            ] as Array<{ key: WithdrawStatusTab; label: string }>).map((tab) => {
              const active = statusTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusTab(tab.key)}
                  className={`px-3 py-1.5 text-[12.5px] font-semibold rounded transition-colors flex items-center gap-1.5 ${
                    active ? 'bg-white text-orange-700 shadow-soft' : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] tabular-nums ${active ? 'text-orange-700' : 'text-ink-500'}`}>
                    {statusCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 relative min-w-[180px]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.withdraw.searchPlaceholder}
              aria-label={t.withdraw.searchAria}
              className="w-full px-3 py-1.5 pl-9 border border-ink-200 rounded-md text-[13px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-[14px]" aria-hidden="true">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 text-ink-400 hover:text-ink-700"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[12.5px] font-bold rounded transition-colors disabled:border-ink-200 disabled:text-ink-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            ⬇ {t.withdraw.export}
          </button>
        </div>

        {exportToast && (
          <div role="status" className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[13px]">
            ✓ {exportToast}
          </div>
        )}

        {HISTORY.length === 0 ? (
          <div className="bg-white rounded-xl py-10 text-center border border-ink-100 text-ink-500 text-[13px]">
            {t.withdraw.empty}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl py-10 text-center border border-ink-100">
            <div className="text-[40px] mb-3">🔎</div>
            <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.withdraw.noMatch}</div>
            <div className="text-[12px] text-ink-500">{t.withdraw.noMatchDesc}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <article key={r.id} className="bg-white rounded-xl border border-ink-100 px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="text-[20px] font-extrabold text-orange-700 min-w-[80px]">${r.amount.toFixed(2)}</div>
                <div className="flex-1 min-w-[160px]">
                  <div className="text-[13px] font-semibold text-ink-900">{r.addressLabel}</div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span suppressHydrationWarning>{new Date(r.createdAt).toISOString().slice(0, 10)}</span>
                    <span className="text-ink-300">·</span>
                    <span className="font-mono text-ink-700">{r.id}</span>
                    {r.rejectReason && (
                      <>
                        <span className="text-ink-300">·</span>
                        <span className="text-rose-700">⚠ {r.rejectReason}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </article>
            ))}
          </div>
        )}
      </UserShell>

    </>
  );
}