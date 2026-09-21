'use client';

import { useState, useMemo, useEffect } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';

/**
 * ProductsClient — admin product CRUD + bulk ops.
 *
 * Layout:
 *   ┌────────────────────────────────────────────┐
 *   │ PageBanner + [+ Add]                       │
 *   │ Bulk bar: [select all] [N selected] [On]   │  ← visible when any selected
 *   │           [Off] [Delete] [Clear]           │
 *   ├────────────────────────────────────────────┤
 *   │ □ ID Img Name Cat Price Stock Status Acts  │  ← checkbox col + per-row
 *   │ □ 1  💻  ...   ...  ...  ...  ...  Detail │
 *   │                                  Delete   │
 *   └────────────────────────────────────────────┘
 *
 * Two modals:
 *   - Detail: read-only summary + editable fields + Save
 *   - Delete: confirm before destructive bulk delete
 *
 * Why a checkbox column instead of row hover-actions: bulk operations
 * need a way to select N items, and SHIFT-click on rows would clash
 * with the detail button. A dedicated checkbox column is the standard
 * admin-table pattern.
 */
export function ProductsClient() {
  const t = useT();
  const [products, setProducts, mounted] = useAdminStore('products');

  // Bulk selection — set of product ids.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Detail modal state.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    category: string;
    price: string;
    stock: string;
    description: string;
  } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Delete confirm state.
  const [deletingIds, setDeletingIds] = useState<number[] | null>(null);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const editing = editingId !== null ? products.find((p: any) => p.id === editingId) ?? null : null;

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && selected.size < products.length;

  // Open detail modal — clone the row into a draft so edits don't mutate UI live.
  const openDetail = (id: number) => {
    const p = products.find((x: any) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setDraft({
      name: p.name,
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
      description: p.description,
    });
    setDraftError(null);
  };

  const closeDetail = () => {
    setEditingId(null);
    setDraft(null);
    setDraftError(null);
  };

  const saveDetail = () => {
    if (!editing || !draft) return;
    const name = draft.name.trim();
    if (!name) {
      setDraftError(t.admin.products.nameRequired);
      return;
    }
    const price = Number(draft.price);
    if (Number.isNaN(price) || price < 0) {
      setDraftError(t.admin.products.priceInvalid);
      return;
    }
    const stock = Number(draft.stock);
    if (Number.isNaN(stock) || stock < 0) {
      setDraftError(t.admin.products.stockInvalid);
      return;
    }
    setProducts(
      products.map((p: any) =>
        p.id === editing.id ? { ...p, name, category: draft.category, price, stock, description: draft.description } : p,
      ),
    );
    closeDetail();
  };

  const toggleStatus = (id: number) => {
    setProducts(products.map((p: any) => (p.id === id ? { ...p, status: !p.status } : p)));
  };

  const addProduct = () => {
    const id = products.length === 0 ? 1 : Math.max(...products.map((p: any) => p.id)) + 1;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setProducts([
      ...products,
      {
        id,
        name: t.admin.products.colName + ' #' + id,
        category: '数码电子',
        price: 0,
        stock: 0,
        description: '',
        cover: '📦',
        status: true,
        created_at: now,
      },
    ]);
  };

  // Bulk selection helpers.
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(products.map((p: any) => p.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkSetStatus = (status: boolean) => {
    const ids = new Set(selected);
    setProducts(products.map((p: any) => (ids.has(p.id) ? { ...p, status } : p)));
  };

  const requestDelete = (ids: number[]) => setDeletingIds(ids);
  const confirmDelete = () => {
    if (!deletingIds) return;
    const idSet = new Set(deletingIds);
    setProducts(products.filter((p: any) => !idSet.has(p.id)));
    // Clear deleted ids from selection so the bulk bar resets.
    setSelected((prev) => {
      const next = new Set(prev);
      deletingIds.forEach((id) => next.delete(id));
      return next;
    });
    setDeletingIds(null);
  };

  return (
    <div>
      <PageBanner
        title={t.admin.products.title}
        accent="emerald"
        trailing={
          <button
            type="button"
            onClick={addProduct}
            className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-700 transition-colors"
          >
            + {t.admin.products.add}
          </button>
        }
      />

      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[12px] text-neutral-500">
          {t.admin.products.count(products.length)}
        </div>

        {/* Bulk action bar — visible when something is selected. */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-[12.5px] flex-wrap">
            <span className="font-bold text-orange-700">{t.admin.products.bulkSelected(selected.size)}</span>
            <span className="text-orange-300">|</span>
            <button
              type="button"
              onClick={() => bulkSetStatus(true)}
              className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-700 transition-colors"
            >
              {t.admin.products.bulkOn}
            </button>
            <button
              type="button"
              onClick={() => bulkSetStatus(false)}
              className="px-2.5 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-white transition-colors"
            >
              {t.admin.products.bulkOff}
            </button>
            <button
              type="button"
              onClick={() => requestDelete(Array.from(selected))}
              className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
            >
              {t.admin.products.delete}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 rounded text-neutral-600 hover:bg-white transition-colors"
            >
              {t.admin.products.bulkClear}
            </button>
          </div>
        )}
      </div>

      <DataTable minWidth="800px">
        <thead>
          <tr>
            <Th className="w-[36px]">
              <input
                type="checkbox"
                aria-label={t.admin.products.selectAll}
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="w-4 h-4 accent-orange-600 cursor-pointer"
              />
            </Th>
            <Th>ID</Th>
            <Th>{t.admin.products.colImg}</Th>
            <Th>{t.admin.products.colName}</Th>
            <Th>{t.admin.products.colCat}</Th>
            <Th>{t.admin.products.colPrice}</Th>
            <Th>{t.admin.products.colStock}</Th>
            <Th>{t.admin.products.colStatus}</Th>
            <Th>{t.admin.products.colAction}</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <Td colSpan={9} className="text-center text-neutral-500 py-6">
                {t.admin.products.empty}
              </Td>
            </tr>
          ) : (
            products.map((p: any) => (
              <tr key={p.id} className={`hover:bg-neutral-50 transition-colors ${selected.has(p.id) ? 'bg-orange-50/40' : ''}`}>
                <Td>
                  <input
                    type="checkbox"
                    aria-label={`${t.admin.products.selectAll} ${p.name}`}
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                </Td>
                <Td className="font-mono text-[12px]">#{p.id}</Td>
                <Td className="text-[18px]">{p.cover}</Td>
                <Td className="font-semibold text-neutral-900 max-w-[180px] truncate" title={p.name}>{p.name}</Td>
                <Td>
                  <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-neutral-100 text-neutral-700">
                    {p.category}
                  </span>
                </Td>
                <Td className="font-bold tabular-nums text-orange-700">${p.price}</Td>
                <Td>
                  <span className={p.stock === 0 ? 'text-rose-600 font-bold' : p.stock < 10 ? 'text-amber-700 font-bold' : ''}>
                    {p.stock}
                  </span>
                </Td>
                <Td>
                  {p.status ? (
                    <StatusBadge kind="paid">{t.admin.products.on}</StatusBadge>
                  ) : (
                    <StatusBadge kind="mute">{t.admin.products.off}</StatusBadge>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openDetail(p.id)}
                    className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors mr-1"
                  >
                    {t.admin.products.detail}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(p.id)}
                    className={`px-2 py-0.5 text-[11px] rounded mr-1 transition-colors ${
                      p.status
                        ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                        : 'bg-emerald-700 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {p.status ? t.admin.products.off : t.admin.products.on}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete([p.id])}
                    aria-label={`${t.admin.products.delete} ${p.name}`}
                    className="px-2 py-0.5 text-[11px] rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    {t.admin.products.delete}
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Detail / edit modal */}
      <Modal open={editingId !== null} title={t.admin.products.detailEdit} onClose={closeDetail} width="560px">
        {editing && draft && (
          <div>
            {/* Summary panel — read-only meta. */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4 flex items-start gap-4">
              <div className="text-[42px] leading-none">{editing.cover}</div>
              <dl className="flex-1 text-[12.5px] space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">ID</dt>
                  <dd className="font-mono text-neutral-700">#{editing.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{t.admin.products.detailCreatedAt}</dt>
                  <dd className="text-neutral-700">{editing.created_at}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{t.admin.products.colStatus}</dt>
                  <dd>
                    {editing.status ? (
                      <StatusBadge kind="paid">{t.admin.products.on}</StatusBadge>
                    ) : (
                      <StatusBadge kind="mute">{t.admin.products.off}</StatusBadge>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-neutral-200 pt-1.5">
                  <dt className="text-neutral-700 font-semibold">{t.admin.products.detailTotalValue}</dt>
                  <dd className="font-bold tabular-nums text-orange-700">
                    ${(editing.price * editing.stock).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor={`d-name`} className="block text-[12px] font-semibold text-neutral-700 mb-1">
                  {t.admin.products.colName} <span className="text-rose-600">*</span>
                </label>
                <input
                  id="d-name"
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="d-cat" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.detailCategory}
                  </label>
                  <input
                    id="d-cat"
                    type="text"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="d-cover" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.colImg}
                  </label>
                  <input
                    id="d-cover"
                    type="text"
                    value={editing.cover}
                    readOnly
                    className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] bg-neutral-50 text-center text-[20px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="d-price" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.colPrice} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="d-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="d-stock" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.colStock} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="d-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={draft.stock}
                    onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="d-desc" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                  {t.admin.products.colDesc}
                </label>
                <textarea
                  id="d-desc"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-y"
                />
              </div>
            </div>

            {draftError && (
              <p role="alert" className="mt-3 text-[12px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                {draftError}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={closeDetail}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={saveDetail}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-700 transition-colors"
              >
                {t.admin.products.save}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deletingIds !== null}
        title={t.admin.products.deleteTitle}
        onClose={() => setDeletingIds(null)}
        width="440px"
      >
        {deletingIds && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-2">
              {t.admin.products.deleteBody(deletingIds.length)}
            </p>
            {deletingIds.length <= 5 && (
              <ul className="text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 mb-3 space-y-1">
                {deletingIds.map((id) => {
                  const p = products.find((x: any) => x.id === id);
                  return p ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="text-[14px]">{p.cover}</span>
                      <span className="font-mono text-neutral-500">#{p.id}</span>
                      <span className="truncate">{p.name}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            <p className="text-[11.5px] text-neutral-500 mb-4">{t.admin.products.deleteHint}</p>
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
                {t.admin.products.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
