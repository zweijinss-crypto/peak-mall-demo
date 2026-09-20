'use client';

import { useEffect, useState } from 'react';
import { UserShell, PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

const KEY = 'peak_withdraw_addresses';

type AddrType = 'crypto' | 'bank';

interface WithdrawAddr {
  id: string;
  type: AddrType;
  label: string;
  address: string;
  network?: string;
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

export default function WithdrawAddressPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const chrome = usePageChrome('withdraw-address');
  const [list, setList] = useState<WithdrawAddr[]>([]);
  const [editing, setEditing] = useState<Omit<WithdrawAddr, 'id'> | null>(null);

  useEffect(() => { setList(load()); }, []);

  const persist = (next: WithdrawAddr[]) => { setList(next); save(next); };
  const startAdd = () => setEditing({ type: 'crypto', label: '', address: '', network: 'TRC20', isDefault: list.length === 0 });
  const cancel = () => setEditing(null);
  const saveIt = () => {
    if (!editing || !editing.label.trim() || !editing.address.trim()) return;
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

  return (
    <>

      <UserShell>
        <PageBanner
          title={t.withdrawAddress.title}
          subtitle={chrome.isEn ? 'Manage crypto and bank withdrawal addresses' : '管理加密货币与银行提现地址'}
          stats={[
            { label: chrome.isEn ? 'Total' : '总地址', value: list.length },
            { label: chrome.isEn ? 'Default' : '默认', value: list.filter((a) => a.isDefault).length, tone: 'accent' as const },
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
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as AddrType })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                  aria-label={t.withdrawAddress.type}
                >
                  <option value="crypto">{t.withdrawAddress.typeCrypto}</option>
                  <option value="bank">{t.withdrawAddress.typeBank}</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.label} *</span>
                <input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.network}</span>
                <input
                  value={editing.network ?? ''}
                  onChange={(e) => setEditing({ ...editing, network: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="TRC20 / ERC20 / BEP20"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.withdrawAddress.address} *</span>
                <input
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-mono"
                />
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
                <header className="flex items-center gap-2 mb-3">
                  <span className="text-[15px] font-bold text-ink-900">{a.label}</span>
                  <span className="px-2 py-0.5 bg-ink-100 text-ink-600 text-[10.5px] font-bold rounded uppercase">
                    {a.type === 'crypto' ? (cp.withdrawAddress.typeCrypto as string) : (cp.withdrawAddress.typeBank as string)}
                  </span>
                  {a.network && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10.5px] font-bold rounded">{a.network}</span>}
                  {a.isDefault && <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded">{t.withdrawAddress.default}</span>}
                </header>
                <div className="text-[12.5px] font-mono text-ink-700 break-all leading-relaxed mb-4">{a.address}</div>
                <footer className="flex gap-3 text-[12.5px]">
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

    </>
  );
}