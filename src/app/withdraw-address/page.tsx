'use client';

import { useEffect, useState } from 'react';
import { UserShell, PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

const KEY = 'peak_withdraw_addresses';

type AddrType = 'crypto' | 'bank';
type CryptoNetwork = 'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | 'POLYGON' | 'ARBITRUM';
const CRYPTO_NETWORKS: CryptoNetwork[] = ['TRC20', 'ERC20', 'BEP20', 'SOL', 'POLYGON', 'ARBITRUM'];

interface BankFields {
  bankName?: string;
  bankHolder?: string;
  bankSwift?: string;
  bankAddr?: string;
}

interface WithdrawAddr extends BankFields {
  id: string;
  type: AddrType;
  label: string;
  address: string;
  network?: CryptoNetwork;
  isDefault: boolean;
}

function load(): WithdrawAddr[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WithdrawAddr[]) : [];
  } catch { return []; }
}
function save(arr: WithdrawAddr[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(arr));
}

function validateAddr(type: AddrType, address: string, network?: CryptoNetwork): string | null {
  const trimmed = address.trim();
  if (!trimmed) return 'addrRequired';
  if (type === 'crypto') {
    if (!network) return 'networkRequired';
    // basic length check — most crypto addresses are 25-64 chars
    if (trimmed.length < 25 || trimmed.length > 64) return 'addrRequired';
  } else {
    // bank account: 6-34 digits typical
    if (!/^[0-9 \-]{6,34}$/.test(trimmed)) return 'addrRequired';
  }
  return null;
}

export default function WithdrawAddressPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const chrome = usePageChrome('withdraw-address');
  const [list, setList] = useState<WithdrawAddr[]>([]);
  const [editing, setEditing] = useState<Omit<WithdrawAddr, 'id'> | null>(null);
  const [errors, setErrors] = useState<{ label?: string; address?: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { setList(load()); }, []);

  const persist = (next: WithdrawAddr[]) => { setList(next); save(next); };
  const startAdd = () => {
    setEditing({ type: 'crypto', label: '', address: '', network: 'TRC20', isDefault: list.length === 0 });
    setErrors({});
  };
  const cancel = () => { setEditing(null); setErrors({}); };
  const saveIt = () => {
    if (!editing) return;
    const errs: { label?: string; address?: string } = {};
    if (!editing.label.trim()) errs.label = 'labelRequired';
    const addrErr = validateAddr(editing.type, editing.address, editing.network);
    if (addrErr) errs.address = addrErr;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const item: WithdrawAddr = { ...editing, id: `wa_${Date.now()}` };
    if (editing.isDefault) {
      persist([...list.map((a) => ({ ...a, isDefault: false })), item]);
    } else {
      persist([...list, item]);
    }
    cancel();
  };
  const remove = (id: string) => {
    if (!confirm(cp.withdrawAddress.removeConfirm as string)) return;
    persist(list.filter((a) => a.id !== id));
  };
  const setDefault = (id: string) => persist(list.map((a) => ({ ...a, isDefault: a.id === id })));

  const copyAddress = async (id: string, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      // fallback: select + execCommand
      const ta = document.createElement('textarea');
      ta.value = addr;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopiedId(id);
        setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
      } catch {
        alert(cp.withdrawAddress.copyErr as string);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const isEn = chrome.isEn;
  const errorText = (key?: string): string => {
    if (!key) return '';
    const v = cp.withdrawAddress[key];
    return typeof v === 'string' ? v : '';
  };

  return (
    <UserShell>
      <PageBanner
        title={t.withdrawAddress.title}
        subtitle={isEn ? 'Manage crypto and bank payout addresses' : '管理加密货币与银行提现地址'}
        stats={[
          { label: isEn ? 'Total' : '总地址', value: list.length },
          { label: isEn ? 'Default' : '默认', value: list.filter((a) => a.isDefault).length, tone: 'accent' as const },
        ]}
        trailing={
          !editing ? (
            <button
              onClick={startAdd}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors flex-shrink-0"
            >
              + {t.withdrawAddress.addNew}
            </button>
          ) : undefined
        }
      />

      {editing ? (
        <div className="bg-white rounded-xl border border-ink-100 p-6 mb-6 max-w-[640px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <label className="block md:col-span-2">
              <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.type} *</span>
              <select
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value as AddrType, network: e.target.value === 'crypto' ? 'TRC20' : undefined })}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                aria-label={t.withdrawAddress.type}
              >
                <option value="crypto">{t.withdrawAddress.typeCrypto}</option>
                <option value="bank">{t.withdrawAddress.typeBank}</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.label} *</span>
              <input
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                className={`w-full px-3 py-2.5 border rounded-md text-[14px] outline-none focus:ring-2 ${errors.label ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'}`}
                aria-invalid={!!errors.label}
                aria-describedby={errors.label ? 'err-label' : undefined}
              />
              {errors.label && <span id="err-label" className="block mt-1 text-[11.5px] text-rose-600">{errorText(errors.label)}</span>}
            </label>

            {editing.type === 'crypto' ? (
              <>
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.network} *</span>
                  <select
                    value={editing.network ?? 'TRC20'}
                    onChange={(e) => setEditing({ ...editing, network: e.target.value as CryptoNetwork })}
                    className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                    aria-label={t.withdrawAddress.network}
                  >
                    {CRYPTO_NETWORKS.map((n) => (
                      <option key={n} value={n}>
                        {cp.withdrawAddress.networks[n] as string}
                      </option>
                    ))}
                  </select>
                </label>
                <div /> {/* spacer for grid balance */}
              </>
            ) : (
              <>
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.bankName}</span>
                  <input
                    value={editing.bankName ?? ''}
                    onChange={(e) => setEditing({ ...editing, bankName: e.target.value })}
                    placeholder={cp.withdrawAddress.bankNamePh as string}
                    className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.bankHolder}</span>
                  <input
                    value={editing.bankHolder ?? ''}
                    onChange={(e) => setEditing({ ...editing, bankHolder: e.target.value })}
                    placeholder={cp.withdrawAddress.bankHolderPh as string}
                    className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.bankSwift}</span>
                  <input
                    value={editing.bankSwift ?? ''}
                    onChange={(e) => setEditing({ ...editing, bankSwift: e.target.value })}
                    placeholder={cp.withdrawAddress.bankSwiftPh as string}
                    className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.bankAddr}</span>
                  <input
                    value={editing.bankAddr ?? ''}
                    onChange={(e) => setEditing({ ...editing, bankAddr: e.target.value })}
                    placeholder={cp.withdrawAddress.bankAddrPh as string}
                    className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </>
            )}

            <label className="block md:col-span-2">
              <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.address} *</span>
              <input
                value={editing.address}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                placeholder={editing.type === 'crypto' ? (isEn ? '0x... or T... (25–64 chars)' : '0x... 或 T... (25-64 位)') : (isEn ? 'digits, 6–34 chars' : '数字 6-34 位')}
                className={`w-full px-3 py-2.5 border rounded-md text-[14px] outline-none focus:ring-2 font-mono ${errors.address ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'}`}
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'err-addr' : undefined}
              />
              {errors.address && <span id="err-addr" className="block mt-1 text-[11.5px] text-rose-600">{errorText(errors.address)}</span>}
            </label>

            <label className="flex items-center gap-2 md:col-span-2 text-[13px] text-ink-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isDefault}
                onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                className="w-5 h-5 accent-orange-700 cursor-pointer"
              />
              {t.withdrawAddress.setDefault}
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={saveIt} className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13.5px] font-bold rounded-md transition-colors">{t.withdrawAddress.save}</button>
            <button onClick={cancel} className="px-5 py-2.5 bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[13.5px] font-bold rounded-md transition-colors">{t.withdrawAddress.cancel}</button>
          </div>
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
          <div className="text-[40px] mb-3">🏦</div>
          <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.withdrawAddress.empty}</div>
          <div className="text-[12px] text-ink-500">{t.withdrawAddress.emptyDesc}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((a) => (
            <article key={a.id} className="bg-white rounded-xl border border-ink-100 p-5">
              <header className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[15px] font-bold text-ink-900">{a.label}</span>
                <span className="px-2 py-0.5 bg-ink-100 text-ink-600 text-[10.5px] font-bold rounded uppercase">
                  {a.type === 'crypto' ? (cp.withdrawAddress.typeCrypto as string) : (cp.withdrawAddress.typeBank as string)}
                </span>
                {a.network && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10.5px] font-bold rounded">{a.network}</span>}
                {a.isDefault && <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded">{t.withdrawAddress.default}</span>}
              </header>

              {a.type === 'bank' && (a.bankName || a.bankHolder) ? (
                <div className="text-[12px] text-ink-600 mb-2 space-y-0.5">
                  {a.bankName && <div><span className="text-ink-500">{t.withdrawAddress.bankName}:</span> {a.bankName}</div>}
                  {a.bankHolder && <div><span className="text-ink-500">{t.withdrawAddress.bankHolder}:</span> {a.bankHolder}</div>}
                  {a.bankSwift && <div><span className="text-ink-500">{t.withdrawAddress.bankSwift}:</span> <span className="font-mono">{a.bankSwift}</span></div>}
                  {a.bankAddr && <div><span className="text-ink-500">{t.withdrawAddress.bankAddr}:</span> {a.bankAddr}</div>}
                </div>
              ) : null}

              <div className="flex items-start gap-2 mb-4">
                <div className="flex-1 text-[12.5px] font-mono text-ink-700 break-all leading-relaxed">{a.address}</div>
                <button
                  onClick={() => copyAddress(a.id, a.address)}
                  aria-label={`${t.withdrawAddress.copy} ${a.label}`}
                  className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                    copiedId === a.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  }`}
                >
                  {copiedId === a.id ? `✓ ${t.withdrawAddress.copied}` : t.withdrawAddress.copy}
                </button>
              </div>

              <footer className="flex gap-3 text-[12.5px] border-t border-ink-100 pt-3">
                {!a.isDefault && (
                  <button onClick={() => setDefault(a.id)} className="font-semibold text-ink-500 hover:text-ink-700">
                    {t.withdrawAddress.setDefault}
                  </button>
                )}
                <button onClick={() => remove(a.id)} className="font-semibold text-rose-600 hover:text-rose-700 ml-auto">
                  {t.withdrawAddress.remove}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </UserShell>
  );
}