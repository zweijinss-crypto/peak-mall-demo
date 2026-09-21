'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd, orderStatusLabel } from '@/lib/admin/fixtures';

const STATUS_KIND: Record<'active' | 'frozen', StatusKind> = {
  active: 'active',
  frozen: 'danger',
};

const ROLE_KIND: Record<'fx' | 'agent', StatusKind> = {
  fx: 'info',
  agent: 'paid',
};

/**
 * UsersClient — admin member CRUD + bulk ops + detail.
 *
 * Same pattern as products / orders:
 *   - bulk select with header checkbox
 *   - bulk action bar (freeze / unfreeze / delete)
 *   - detail modal: 3 sections (account / finance / recent orders)
 *   - delete confirm modal
 */
export function UsersClient() {
  const t = useT();
  const [users, setUsers, mounted] = useAdminStore('users');
  const [orders] = useAdminStore('orders');

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<number[] | null>(null);

  // Toast — single-flight 3s auto-dismiss; aligns with wd / agents pattern.
  const [toast, setToast] = useState<{ kind: 'success' | 'info' | 'danger'; text: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);
  const showToast = (kind: 'success' | 'info' | 'danger', text: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ kind, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const detail = detailId !== null ? users.find((u: any) => u.id === detailId) ?? null : null;

  const visibleIds = users.map((u: any) => u.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = visibleIds.some((id) => selected.has(id)) && !allSelected;

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };
  const clearSelection = () => setSelected(new Set());

  const setStatus = (ids: number[], status: 'active' | 'frozen') => {
    const idSet = new Set(ids);
    const n = ids.length;
    setUsers(users.map((u: any) => (idSet.has(u.id) ? { ...u, status } : u)));
    showToast(
      status === 'frozen' ? 'info' : 'success',
      n > 1
        ? (status === 'frozen' ? t.admin.users.bulkFrozenToast(n) : t.admin.users.bulkUnfrozenToast(n))
        : (status === 'frozen' ? t.admin.users.frozenToast : t.admin.users.unfrozenToast)
    );
  };

  const setRole = (id: number, role: 'fx' | 'agent') => {
    setUsers(users.map((u: any) => (u.id === id ? { ...u, role } : u)));
    showToast('info', t.admin.users.roleChangedToast);
  };

  const requestDelete = (ids: number[]) => setDeletingIds(ids);
  const confirmDelete = () => {
    if (!deletingIds) return;
    const n = deletingIds.length;
    const idSet = new Set(deletingIds);
    setUsers(users.filter((u: any) => !idSet.has(u.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      deletingIds.forEach((id) => next.delete(id));
      return next;
    });
    setDeletingIds(null);
    showToast('danger', t.admin.users.bulkDeletedToast(n));
  };

  const add = () => {
    const id = users.length === 0 ? 1 : Math.max(...users.map((u: any) => u.id)) + 1;
    const today = new Date().toISOString().slice(0, 10);
    setUsers([
      ...users,
      {
        id,
        nickname: '新用户',
        username: `user_${id}`,
        role: 'fx',
        referrer: '—',
        teamCount: 0,
        status: 'active',
        created_at: today,
        balance: 0,
      },
    ]);
    showToast('success', t.admin.users.addedToast);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <PageBanner title={t.admin.users.title} accent="emerald" />
        <button
          type="button"
          onClick={add}
          className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 hover:bg-orange-800 text-white transition-colors"
        >
          + {t.admin.users.add}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-[12.5px] flex-wrap">
          <span className="font-bold text-orange-700">{t.admin.users.bulkSelected(selected.size)}</span>
          <span className="text-orange-300">|</span>
          <button
            type="button"
            onClick={() => setStatus(Array.from(selected), 'frozen')}
            className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
          >
            {t.admin.users.bulkFreeze}
          </button>
          <button
            type="button"
            onClick={() => setStatus(Array.from(selected), 'active')}
            className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-700 transition-colors"
          >
            {t.admin.users.bulkUnfreeze}
          </button>
          <button
            type="button"
            onClick={() => requestDelete(Array.from(selected))}
            className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
          >
            {t.admin.users.delete}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="px-2.5 py-1 rounded text-neutral-600 hover:bg-white transition-colors"
          >
            {t.admin.users.bulkClear}
          </button>
        </div>
      )}

      <DataTable minWidth="920px">
        <thead>
          <tr>
            <Th className="w-[36px]">
              <input
                type="checkbox"
                aria-label={t.admin.users.selectAll}
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="w-4 h-4 accent-orange-600 cursor-pointer"
              />
            </Th>
            <Th>ID</Th>
            <Th>{t.admin.users.colRole.replace('角色', '用户').replace('Role', 'Member')}</Th>
            <Th>{t.admin.users.colRole}</Th>
            <Th>{t.admin.users.colReferrer}</Th>
            <Th>{t.admin.users.colTeam}</Th>
            <Th>{t.admin.users.colBal}</Th>
            <Th>{t.admin.users.colStatus}</Th>
            <Th>{t.admin.users.colReg}</Th>
            <Th>{t.admin.users.colTrc20}</Th>
            <Th>{t.admin.users.colAction}</Th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <Td colSpan={11} className="text-center text-neutral-500 py-6">
                {t.admin.users.empty}
              </Td>
            </tr>
          ) : (
            users.map((u: any) => (
              <tr
                key={u.id}
                className={`hover:bg-neutral-50 transition-colors ${selected.has(u.id) ? 'bg-orange-50/40' : ''}`}
              >
                <Td>
                  <input
                    type="checkbox"
                    aria-label={`${t.admin.users.selectAll} ${u.username}`}
                    checked={selected.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                </Td>
                <Td className="font-mono text-[12px]">#{u.id}</Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => setDetailId(u.id)}
                    className="font-semibold text-neutral-900 hover:text-orange-700 transition-colors"
                  >
                    {u.nickname} <span className="text-neutral-500 text-[11px]">@{u.username}</span>
                  </button>
                </Td>
                <Td>
                  <StatusBadge kind={ROLE_KIND[u.role as 'fx' | 'agent']}>
                    {u.role === 'agent' ? t.admin.users.colRoleAgent : t.admin.users.colRoleFx}
                  </StatusBadge>
                </Td>
                <Td className="text-[11.5px] text-neutral-700">{u.referrer || '—'}</Td>
                <Td className="tabular-nums">{u.teamCount || 0}</Td>
                <Td className={`font-bold tabular-nums ${u.balance > 0 ? 'text-orange-700' : 'text-neutral-500'}`}>
                  {usd(u.balance)}
                </Td>
                <Td>
                  <StatusBadge kind={STATUS_KIND[u.status as 'active' | 'frozen']}>
                    {u.status === 'active' ? t.admin.users.statusActive : t.admin.users.statusFrozen}
                  </StatusBadge>
                </Td>
                <Td muted className="text-[11.5px]">{u.created_at}</Td>
                <Td muted className="max-w-[160px] truncate text-[11.5px] font-mono">
                  {u.withdraw_address || '—'}
                </Td>
                <Td className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setDetailId(u.id)}
                    className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 mr-1 transition-colors"
                  >
                    {t.admin.users.detail}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setStatus([u.id], u.status === 'active' ? 'frozen' : 'active')
                    }
                    className={`px-2 py-0.5 text-[11px] rounded mr-1 transition-colors ${
                      u.status === 'active'
                        ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                        : 'bg-emerald-700 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {u.status === 'active' ? t.admin.users.freeze : t.admin.users.unfreeze}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete([u.id])}
                    aria-label={`${t.admin.users.delete} ${u.username}`}
                    className="px-2 py-0.5 text-[11px] rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    {t.admin.users.delete}
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Detail modal — 3 sections */}
      <Modal
        open={detailId !== null}
        title={t.admin.users.detailTitle}
        onClose={() => setDetailId(null)}
        width="600px"
      >
        {detail && (
          <div>
            <section className="bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-3">
                {t.admin.users.basicSection}
              </h3>
              <dl className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[12.5px]">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">ID</dt>
                  <dd className="font-mono text-neutral-700">#{detail.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.users.colReg}</dt>
                  <dd className="text-neutral-700">{detail.created_at}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">昵称</dt>
                  <dd className="font-semibold text-neutral-800">{detail.nickname}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">账号</dt>
                  <dd className="font-mono text-neutral-700">@{detail.username}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.users.colReferrer}</dt>
                  <dd className="text-neutral-700">{detail.referrer || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.users.colTeam}</dt>
                  <dd className="font-bold tabular-nums">{detail.teamCount || 0}</dd>
                </div>
                <div className="col-span-2 flex justify-between items-center pt-2 border-t border-neutral-200">
                  <dt className="text-neutral-500">{t.admin.users.colRole}</dt>
                  <dd className="flex items-center gap-2">
                    <StatusBadge kind={ROLE_KIND[detail.role as 'fx' | 'agent']}>
                      {detail.role === 'agent' ? t.admin.users.colRoleAgent : t.admin.users.colRoleFx}
                    </StatusBadge>
                    <button
                      type="button"
                      onClick={() => setRole(detail.id, detail.role === 'agent' ? 'fx' : 'agent')}
                      className="px-2 py-0.5 text-[10.5px] rounded border border-orange-300 text-orange-700 hover:bg-orange-50 transition-colors"
                    >
                      ↻ {t.admin.users.changeRole}
                    </button>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-2">
                {t.admin.users.financeSection}
              </h3>
              <dl className="bg-white border border-neutral-200 rounded-md p-3 text-[12.5px] space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">{t.admin.users.colBal}</dt>
                  <dd className="font-bold tabular-nums text-orange-700 text-[15px]">{usd(detail.balance)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500 flex-shrink-0">{t.admin.users.colTrc20}</dt>
                  <dd className="font-mono text-[11px] text-neutral-700 text-right truncate">
                    {detail.withdraw_address || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  {t.admin.users.recentOrdersSection}
                </h3>
                <Link
                  href={`/admin/orders?username=${detail.username}`}
                  className="text-[11px] text-orange-700 hover:text-orange-800"
                >
                  {t.admin.users.viewAllOrders} →
                </Link>
              </div>
              <RecentOrders username={detail.username} orders={orders} t={t} />
            </section>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => requestDelete([detail.id])}
                className="px-3 py-1.5 text-[12.5px] font-medium rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.users.delete}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus([detail.id], detail.status === 'active' ? 'frozen' : 'active');
                  setDetailId(null);
                }}
                className={`px-3 py-1.5 text-[12.5px] font-bold rounded-md transition-colors ${
                  detail.status === 'active'
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-emerald-700 text-white hover:bg-emerald-700'
                }`}
              >
                {detail.status === 'active' ? t.admin.users.freeze : t.admin.users.unfreeze}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deletingIds !== null}
        title={t.admin.users.deleteTitle}
        onClose={() => setDeletingIds(null)}
        width="440px"
      >
        {deletingIds && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-2">{t.admin.users.deleteBody(deletingIds.length)}</p>
            {deletingIds.length <= 5 && (
              <ul className="text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 mb-3 space-y-1">
                {deletingIds.map((id) => {
                  const u = users.find((x: any) => x.id === id);
                  return u ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="font-mono text-neutral-500">#{u.id}</span>
                      <span className="truncate">{u.nickname} <span className="text-neutral-500">@{u.username}</span></span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            <p className="text-[11.5px] text-neutral-500 mb-4">{t.admin.users.deleteHint}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingIds(null)}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t.admin.users.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast — bulk + single ops feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-[13px] rounded-lg shadow-lg text-white ${
            toast.kind === 'success' ? 'bg-emerald-700'
            : toast.kind === 'danger' ? 'bg-rose-700'
            : 'bg-neutral-900'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function RecentOrders({ username, orders, t }: { username: string; orders: any[]; t: any }) {
  const rows = useMemo(
    () => orders.filter((o: any) => o.username === username).slice(-5).reverse(),
    [orders, username],
  );
  if (rows.length === 0) {
    return (
      <div className="text-[12px] text-neutral-400 py-3 text-center bg-white border border-neutral-200 rounded-md">
        {t.admin.users.recentOrdersEmpty}
      </div>
    );
  }
  return (
    <ul className="bg-white border border-neutral-200 rounded-md divide-y divide-neutral-100">
      {rows.map((o: any) => (
        <li key={o.id} className="flex items-center justify-between px-3 py-2 text-[12px]">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] text-neutral-500 truncate">{o.order_no}</div>
            <div className="text-neutral-700">{o.created_at}</div>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className="font-bold tabular-nums text-orange-700">{usd(o.amount)}</span>
            <StatusBadge kind={o.status === 'cancelled' ? 'danger' : 'info'}>
              {orderStatusLabel(o.status, 'zh')}
            </StatusBadge>
          </div>
        </li>
      ))}
    </ul>
  );
}