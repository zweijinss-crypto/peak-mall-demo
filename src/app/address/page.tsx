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
  /** D4: tag selector — home / office / other */
  tag: 'home' | 'office' | 'other';
}

function loadAddrs(): Address[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Address[]) : [];
    // D4 migration: 旧数据无 tag,补默认 'home'
    return arr.map((a) => ({ ...a, tag: (a.tag ?? 'home') as Address['tag'] }));
  } catch {
    return [];
  }
}

function saveAddrs(arr: Address[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(arr));
}

const EMPTY: Omit<Address, 'id'> = { name: '', phone: '', region: '', detail: '', isDefault: false, tag: 'home' };

/** D3: 中国大陆手机号验证 — 11 位数字,1[3-9] 开头 */
function validatePhone(p: string): boolean {
  return /^1[3-9]\d{9}$/.test(p.trim());
}

export default function AddressPage() {
  const t = useT();
  const cp = useT() as Record<string, any>;
  const chrome = usePageChrome('address');
  const [list, setList] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Omit<Address, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  /** D3: phone 验证错误(仅当用户输入后显示) */
  const [phoneError, setPhoneError] = useState<string | null>(null);

  /** D4: name required error */
  const [nameError, setNameError] = useState<string | null>(null);

  /** D2: 删除确认 modal — pendingId = 待删除地址 id, null = 关闭 */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteFlash, setDeleteFlash] = useState<string | null>(null);

  /** D4: saved flash */
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

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
    setPhoneError(null);
  };
  const startEdit = (a: Address) => {
    setEditing({ ...a });
    setEditingId(a.id);
    setPhoneError(null);
  };
  const cancel = () => {
    setEditing(null);
    setEditingId(null);
    setPhoneError(null);
  };
  const save = () => {
    if (!editing) return;
    // D4: name required inline error
    if (!editing.name.trim()) {
      setNameError(t.address.nameRequired);
      return;
    }
    setNameError(null);
    if (!editing.phone.trim() || !validatePhone(editing.phone)) {
      setPhoneError(t.address.phoneInvalid);
      return;
    }
    setPhoneError(null);
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
    setSavedFlash(t.address.savedFlash);
    window.setTimeout(() => setSavedFlash(null), 1800);
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
                  onChange={(e) => {
                    setEditing({ ...editing, name: e.target.value });
                    if (nameError && e.target.value.trim()) setNameError(null);
                  }}
                  aria-invalid={nameError ? 'true' : 'false'}
                  aria-describedby={nameError ? 'nameErr' : undefined}
                  className={`w-full px-3 py-2.5 border rounded-md text-[14px] outline-none focus:ring-2 ${
                    nameError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'
                  }`}
                />
                {nameError && (
                  <span id="nameErr" role="alert" className="block mt-1 text-[11.5px] text-rose-600">
                    ⚠ {nameError}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="block text-[13px] text-ink-600 mb-1.5">{t.address.phone} *</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={editing.phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setEditing({ ...editing, phone: digits });
                    // 实时验证 — 只在用户输过至少 1 位后报错
                    if (digits.length > 0) {
                      setPhoneError(validatePhone(digits) ? null : t.address.phoneInvalid);
                    } else {
                      setPhoneError(null);
                    }
                  }}
                  placeholder={t.address.phonePh}
                  aria-invalid={phoneError ? 'true' : 'false'}
                  aria-describedby={phoneError ? 'phoneErr' : undefined}
                  className={`w-full px-3 py-2.5 border rounded-md text-[14px] outline-none focus:ring-2 ${
                    phoneError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'
                  }`}
                />
                {phoneError && (
                  <span id="phoneErr" role="alert" className="block mt-1 text-[11.5px] text-rose-600">
                    ⚠ {phoneError}
                  </span>
                )}
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

              {/* D4: tag selector (家 / 公司 / 其他) */}
              <fieldset className="md:col-span-2">
                <legend className="block text-[13px] text-ink-600 mb-1.5">{t.address.tag}</legend>
                <div role="radiogroup" aria-label={t.address.tag} className="flex gap-2">
                  {([
                    { key: 'home',   label: t.address.tagHome },
                    { key: 'office', label: t.address.tagOffice },
                    { key: 'other',  label: t.address.tagOther },
                  ] as Array<{ key: Address['tag']; label: string }>).map((tg) => {
                    const active = editing.tag === tg.key;
                    return (
                      <button
                        key={tg.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setEditing({ ...editing, tag: tg.key })}
                        className={`px-4 py-1.5 rounded-md text-[13px] font-semibold border transition-colors ${
                          active
                            ? 'bg-orange-700 text-white border-orange-700'
                            : 'bg-white text-ink-700 border-ink-200 hover:border-orange-500'
                        }`}
                      >
                        {tg.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
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

        {/* D4: 保存成功 toast */}
        {savedFlash && (
          <div
            role="status"
            className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-float text-[14px] font-semibold animate-fade-up z-50"
          >
            ✓ {savedFlash}
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
                <header className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    a.tag === 'home' ? 'bg-emerald-100 text-emerald-700' :
                    a.tag === 'office' ? 'bg-blue-100 text-blue-700' :
                    'bg-ink-100 text-ink-700'
                  }`}>
                    {a.tag === 'home' ? t.address.tagHome : a.tag === 'office' ? t.address.tagOffice : t.address.tagOther}
                  </span>
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