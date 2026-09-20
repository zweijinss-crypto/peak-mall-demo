'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  UserShell,
} from '@/components/peak-mall';
import { usePeakStore, type Order } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

type StatusTab = 'all' | Order['status'];

/**
 * /orders — 我的订单
 * A3: status tab filter + search by ID/name
 * A4: cancel pending order + buy again (reorder to cart)
 */
export default function OrdersPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('orders');
  const orders = usePeakStore((s) => s.orders);
  const cancelOrder = usePeakStore((s) => s.cancelOrder);
  const reorder = usePeakStore((s) => s.reorder);

  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  /** A4: cancel modal — pendingId = 待取消订单 id, null = 关闭 */
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);

  const STATUS_MAP: Record<Order['status'], { label: string; color: string }> = {
    pending: { label: t.orders.statusPending, color: 'bg-amber-100 text-amber-700' },
    paid: { label: t.orders.statusPaid, color: 'bg-blue-100 text-blue-700' },
    shipped: { label: t.orders.statusShipped, color: 'bg-violet-100 text-violet-700' },
    delivered: { label: t.orders.statusDelivered, color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: t.orders.cancelledTag, color: 'bg-ink-200 text-ink-600' },
  };

  const TABS: Array<{ key: StatusTab; label: string }> = [
    { key: 'all', label: t.orders.tabAll },
    { key: 'pending', label: t.orders.tabPending },
    { key: 'paid', label: t.orders.tabPaid },
    { key: 'shipped', label: t.orders.tabShipped },
    { key: 'delivered', label: t.orders.tabDelivered },
    { key: 'cancelled', label: t.orders.tabCancelled },
  ];

  const statusCounts = useMemo(() => {
    const acc: Record<Order['status'], number> = {
      pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0,
    };
    for (const o of orders) acc[o.status]++;
    return acc;
  }, [orders]);

  const filtered = useMemo(() => {
    let arr = orders;
    if (activeTab !== 'all') arr = arr.filter((o) => o.status === activeTab);
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((o) =>
        o.id.toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [orders, activeTab, search]);

  const totalCount = orders.length;
  const totalSpend = orders.reduce((s, o) => s + o.total, 0);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  };

  const handleCancel = (id: string) => {
    setPendingCancel(id);
  };

  const confirmCancel = () => {
    if (!pendingCancel) return;
    const ok = cancelOrder(pendingCancel);
    setPendingCancel(null);
    if (ok) flashToast(t.orders.cancelled);
  };

  const handleReorder = (id: string) => {
    const ok = reorder(id);
    if (ok) {
      flashToast(t.orders.buyAgainOk);
      window.setTimeout(() => router.push('/cart/'), 600);
    }
  };

  return (
    <>
      <UserShell>
        {/* Top banner — status at a glance */}
        <section className="bg-white border border-ink-100 overflow-hidden mb-5">
          <div className="h-1 bg-orange-700" aria-hidden="true" />
          <div className="px-5 py-4 md:px-6 md:py-5 flex items-center gap-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] md:text-[22px] font-bold text-ink-900 leading-tight">
                {t.orders.title}
              </h1>
              <div className="mt-1 text-[12px] text-ink-500">
                {chrome.isEn
                  ? 'Track and manage every order in one place'
                  : '查看和管理你的所有订单'}
              </div>
            </div>
            <div className="flex divide-x divide-ink-100 border border-ink-100 flex-shrink-0">
              <div className="px-4 py-2 text-center min-w-[64px]">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-0.5">
                  {chrome.isEn ? 'Total' : '订单数'}
                </div>
                <div className="text-[18px] font-bold text-ink-900 leading-none tabular-nums">
                  {totalCount}
                </div>
              </div>
              <div className="px-4 py-2 text-center min-w-[80px]">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-0.5">
                  {chrome.isEn ? 'Spend' : '总金额'}
                </div>
                <div className="text-[18px] font-bold text-orange-700 leading-none tabular-nums">
                  ${totalSpend.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="grid grid-cols-5 border-t border-ink-100 divide-x divide-ink-100">
              {(['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as Order['status'][]).map((s) => (
                <div key={s} className="px-4 py-2.5">
                  <div className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold mb-1 ${STATUS_MAP[s].color}`}>
                    {STATUS_MAP[s].label}
                  </div>
                  <div className="text-[16px] font-bold text-ink-900 leading-none tabular-nums">
                    {statusCounts[s]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Toast */}
        {toast && (
          <div
            role="status"
            className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[13px]"
          >
            ✓ {toast}
          </div>
        )}

        {/* A4: cancel confirm modal */}
        {pendingCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancelOrderTitle"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) setPendingCancel(null); }}
          >
            <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-float">
              <div className="text-[28px] mb-2" aria-hidden="true">⚠️</div>
              <h3 id="cancelOrderTitle" className="text-[18px] font-extrabold text-ink-900 mb-1.5">
                {t.orders.cancelConfirm}
              </h3>
              <p className="text-[12.5px] text-ink-500 mb-5">
                {t.orders.cancelHint}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingCancel(null)}
                  className="flex-1 py-2.5 border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {chrome.isEn ? 'Keep order' : '不取消'}
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[13.5px] font-bold rounded-md transition-colors"
                >
                  {t.orders.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Search — only when there are orders */}
        {orders.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div role="tablist" className="flex flex-wrap gap-1 bg-ink-50 border border-ink-100 p-1 rounded-md">
              {TABS.map((tab) => {
                const count = tab.key === 'all' ? totalCount : statusCounts[tab.key];
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-[12.5px] font-semibold rounded transition-colors flex items-center gap-1.5 ${
                      active ? 'bg-white text-orange-700 shadow-soft' : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] tabular-nums ${active ? 'text-orange-700' : 'text-ink-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.orders.searchPlaceholder}
                aria-label={t.orders.searchAria}
                className="w-full px-3 py-2 pl-9 border border-ink-200 rounded-md text-[13px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
            <div className="text-[64px] mb-4">📦</div>
            <div className="text-[18px] font-bold text-ink-900 mb-2">{t.orders.empty}</div>
            <div className="text-[13.5px] text-ink-500 mb-6">{t.orders.emptyDesc}</div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-bold rounded-md transition-colors"
            >
              {t.orders.startShopping}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
            <div className="text-[40px] mb-3">🔎</div>
            <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.orders.noMatch}</div>
            <div className="text-[12px] text-ink-500">{t.orders.noMatchDesc}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((o: Order) => {
              const st = STATUS_MAP[o.status];
              const canCancel = o.status === 'pending';
              return (
                <article
                  key={o.id}
                  className={`bg-white rounded-xl border border-ink-100 overflow-hidden ${
                    o.status === 'cancelled' ? 'opacity-80' : ''
                  }`}
                >
                  <header className="flex flex-wrap items-center gap-3 px-5 py-3 bg-ink-50 border-b border-ink-100 text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-500">{t.orders.placedAt}:</span>
                      <span className="font-semibold text-ink-900">{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-500">{t.orders.orderId}:</span>
                      <span className="font-mono font-semibold text-ink-900">{o.id}</span>
                    </div>
                    <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${st.color}`}>
                      {st.label}
                    </span>
                  </header>

                  <div className="p-5 space-y-3">
                    {o.items.map((it) => (
                      <div key={it.productId} className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-ink-100 overflow-hidden flex-shrink-0">
                          {it.cover?.startsWith('/') || it.cover?.startsWith('http') ? (
                            <Image src={it.cover} alt={it.name} width={80} height={80} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[24px]">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => router.push(`/shop/${it.productId}`)}
                            className="text-[14px] font-semibold text-ink-900 hover:text-orange-700 transition-colors line-clamp-1 text-left"
                          >
                            {it.name}
                          </button>
                          <div className="text-[12px] text-ink-500 mt-0.5">× {it.qty}</div>
                        </div>
                        <div className="text-[14.5px] font-bold text-orange-700">${(it.price * it.qty).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <footer className="flex flex-wrap justify-between items-center gap-3 px-5 py-3.5 bg-ink-50 border-t border-ink-100">
                    <span className="text-[12.5px] text-ink-500">
                      {t.orders.itemCount(o.items.reduce((s, i) => s + i.qty, 0))}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-ink-600">
                        {t.orders.amount}: <b className="text-orange-700 text-[16px]">${o.total.toFixed(2)}</b>
                      </span>
                      <button
                        onClick={() => router.push(`/shop/${o.items[0].productId}`)}
                        className="text-[12.5px] font-semibold text-orange-700 hover:text-primary-dark transition-colors"
                      >
                        {t.orders.viewDetail} →
                      </button>
                      <button
                        onClick={() => handleReorder(o.id)}
                        className="px-3 py-1.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[12px] font-bold rounded transition-colors"
                      >
                        ↻ {t.orders.buyAgain}
                      </button>
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(o.id)}
                          className="px-3 py-1.5 border border-ink-200 text-ink-600 hover:border-rose-300 hover:text-rose-700 text-[12px] font-bold rounded transition-colors"
                        >
                          {t.orders.cancel}
                        </button>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </UserShell>
    </>
  );
}
