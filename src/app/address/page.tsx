'use client';

import { useEffect, useState } from 'react';
import { UserShell, PageBanner } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

const KEY = 'peak_addresses';

interface Address {
  id: string;
  name: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
}

function loadAddrs(): Address[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

function saveAddrs(arr: Address[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(arr));
}

const EMPTY: Omit<Address, 'id'> = { name: '', phone: '', region: '', detail: '', isDefault: false };

export default function AddressPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const chrome = usePageChrome('address');
  const [list, setList] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Omit<Address, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  /** D2: 删除确认 modal — pendingId = 待删除地址 id, null = 关闭 */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteFlash, setDeleteFlash] = useState<string | null>(null);

  useEffect(() => {
    setList(loadAddrs());
  }, []);

  const persist = (next: Address[]) => {
    setList(next);
    saveAddrs(next);
  };

  const startAdd = () => {
    setEditing({ ...EMPTY, isDefault: list.length === 0 });
    setEditingId(null);
  };
  const startEdit = (a: Address) => {
    setEditing({ ...a });
    setEditingId(a.id);
  };
  const cancel = () => {
    setEditing(null);
    setEditingId(null);
  };
  const save = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.phone.trim()) return;
    if (editing.isDefault) {
      // ensure single default
      persist([
        ...list.map((a) => ({ ...a, isDefault: false })),
        {
          ...editing,
          id: editingId ?? `addr_${Date.now()}`,
          isDefault: true,
        },
      ]);
    } else if (editingId) {
      persist(list.map((a) => (a.id === editingId ? { ...editing, id: editingId } : a)));
    } else {
      persist([
        ...list,
        {
          ...editing,
          id: `addr_${Date.now()}`,
        },
      ]);
    }
    cancel();
  };
  const remove = (id: string) => {
    setPendingDelete(id);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const next = list.filter((a) => a.id !== pendingDelete);
    persist(next);
    setDeleteFlash(t.address.removed ?? '已删除');
    setPendingDelete(null);
    window.setTimeout(() => setDeleteFlash(null), 1800);
  };
  const setDefault = (id: string) => {
    persist(list.map((a) => ({ ...a, isDefault: a.id === id })));
  };

  return (
    <>

      <UserShell>
        <PageBanner
          title={t.address.title}
          subtitle={chrome.isEn ? 'Manage shipping addresses' : '管理收货地址'}
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
                + {t.address.addNew}
              </button>
            ) : undefined
          }
        />

        {editing ? (
          <div className="bg-white rounded-xl border border-ink-100 p-6 mb-6 max-w-[640px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.address.name} *</span>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.address.phone} *</span>
                <input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.address.region}</span>
                <input
                  value={editing.region}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="上海市 浦东新区"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.address.detail}</span>
                <input
                  value={editing.detail}
                  onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="张江路 88 号 3 楼"
                />
              </label>
              <label className="flex items-center gap-2 md:col-span-2 text-[13px] text-ink-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isDefault}
                  onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                  className="w-5 h-5 accent-orange-700 cursor-pointer"
                />
                {t.address.setDefault}
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={save}
                className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13.5px] font-bold rounded-md transition-colors"
              >
                {t.address.save}
              </button>
              <button
                onClick={cancel}
                className="px-5 py-2.5 bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[13.5px] font-bold rounded-md transition-colors"
              >
                {t.address.cancel}
              </button>
            </div>
          </div>
        ) : null}

        {/* D2: 删除确认 modal */}
        {pendingDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delAddrTitle"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) setPendingDelete(null); }}
          >
            <div className="bg-white rounded-2xl w-full max-w-[400px] p-6 shadow-float">
              <div className="text-[28px] mb-2" aria-hidden="true">🗑️</div>
              <h3 id="delAddrTitle" className="text-[18px] font-extrabold text-ink-900 mb-1.5">
                {t.address.removeConfirm}
              </h3>
              <p className="text-[12.5px] text-ink-500 mb-5">
                {t.address.removeHint ?? '该地址将从你的收货地址簿中移除,此操作不可撤销。'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 py-2.5 border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {t.address.cancel}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {t.address.remove}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D2: 删除成功 toast */}
        {deleteFlash && (
          <div
            role="status"
            className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-float text-[14px] font-semibold animate-fade-up z-50"
          >
            ✓ {deleteFlash}
          </div>
        )}

        {list.length === 0 ? (
          <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
            <div className="text-[40px] mb-3">📍</div>
            <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.address.empty}</div>
            <div className="text-[12px] text-ink-500">{t.address.emptyDesc}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((a) => (
              <article
                key={a.id}
                className="bg-white rounded-xl border border-ink-100 p-5 hover:shadow-soft transition-shadow"
              >
                <header className="flex items-center gap-2 mb-3">
                  <span className="text-[15px] font-bold text-ink-900">{a.name}</span>
                  <span className="text-[13px] text-ink-500">{a.phone}</span>
                  {a.isDefault && (
                    <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded">
                      {t.address.default}
                    </span>
                  )}
                </header>
                <div className="text-[13px] text-ink-700 leading-relaxed mb-4">
                  {a.region} {a.detail}
                </div>
                <footer className="flex gap-3 text-[12.5px]">
                  <button onClick={() => startEdit(a)} className="font-semibold text-orange-700 hover:text-orange-800">
                    {t.address.edit}
                  </button>
                  {!a.isDefault && (
                    <button onClick={() => setDefault(a.id)} className="font-semibold text-ink-500 hover:text-ink-700">
                      {t.address.setDefault}
                    </button>
                  )}
                  <button onClick={() => remove(a.id)} className="font-semibold text-rose-600 hover:text-rose-700 ml-auto">
                    {t.address.remove}
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