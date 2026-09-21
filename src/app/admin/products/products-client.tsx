'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { Modal } from '@/components/admin/Modal';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import type { AdminProduct } from '@/lib/admin/fixtures';

/**
 * ProductsClient — admin product CRUD + bulk ops + edit history (5s undo).
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ PageBanner + [+ Add]                                │
 *   │ Bulk bar: [select all] [N selected] [On] [Off] [X]  │
 *   ├─────────────────────────────────────────────────────┤
 *   │ □ ID Img SKU Name Cat Price Compare Cost Stock ...  │
 *   │                            Alert Status Acts        │
 *   └─────────────────────────────────────────────────────┘
 *
 * Modals:
 *   - Detail: read-only meta + all editable fields + Save (with undo)
 *   - Delete: confirm before destructive bulk delete
 *
 * Edit history: every successful save snapshots the previous row in a
 * lastEdit ref; a 5s toast offers Undo, which restores the row.
 */

type Draft = {
  name: string;
  sku: string;
  category: string;
  price: string;
  comparePrice: string;
  cost: string;
  stock: string;
  stockAlert: string;
  description: string;
  images: string[];
  seoSlug: string;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  sku: '',
  category: '',
  price: '0',
  comparePrice: '',
  cost: '',
  stock: '0',
  stockAlert: '5',
  description: '',
  images: [],
  seoSlug: '',
};

const SKU_RE = /^[A-Za-z0-9_-]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

function draftFromProduct(p: AdminProduct): Draft {
  return {
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: String(p.price),
    comparePrice: p.comparePrice != null ? String(p.comparePrice) : '',
    cost: p.cost != null ? String(p.cost) : '',
    stock: String(p.stock),
    stockAlert: String(p.stockAlert),
    description: p.description,
    images: [...p.images],
    seoSlug: p.seoSlug ?? '',
  };
}

/**
 * Tiny inline Markdown preview for the description box.
 * Supports: #/##/### headers, **bold**, *italic*, - bullets, and newlines.
 * Good enough for product marketing copy; no dependency.
 */
function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = escape(md).split('\n');
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^### /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="text-[13px] font-bold mt-2 mb-1">${line.slice(4)}</h3>`);
    } else if (/^## /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="text-[14px] font-bold mt-2 mb-1">${line.slice(3)}</h2>`);
    } else if (/^# /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1 class="text-[16px] font-bold mt-2 mb-1">${line.slice(2)}</h1>`);
    } else if (/^- /.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-5 my-1 space-y-0.5">'); inList = true; }
      out.push(`<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>')}</li>`);
    } else if (line === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<br/>');
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p class="my-1">${line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>')}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

export function ProductsClient() {
  const t = useT();
  const [products, setProducts, mounted] = useAdminStore('products');

  // Bulk selection — set of product ids.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Detail modal state.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');
  const [imgInput, setImgInput] = useState('');

  // Delete confirm state.
  const [deletingIds, setDeletingIds] = useState<number[] | null>(null);

  // Undo toast state.
  const [undo, setUndo] = useState<{ row: AdminProduct; timer: number } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const editing = editingId !== null ? products.find((p) => p.id === editingId) ?? null : null;

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && selected.size < products.length;

  // ───── open / close detail ─────
  const openDetail = (id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setDraft(draftFromProduct(p));
    setDraftError(null);
    setDescTab('edit');
    setImgInput('');
  };

  const closeDetail = () => {
    setEditingId(null);
    setDraft(null);
    setDraftError(null);
    setDescTab('edit');
    setImgInput('');
  };

  // ───── image chip helpers ─────
  const addImage = () => {
    const v = imgInput.trim();
    if (!v || !draft) return;
    if (draft.images.includes(v)) {
      setImgInput('');
      return;
    }
    setDraft({ ...draft, images: [...draft.images, v] });
    setImgInput('');
  };
  const removeImage = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, images: draft.images.filter((_, i) => i !== idx) });
  };
  const moveImage = (idx: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = idx + dir;
    if (next < 0 || next >= draft.images.length) return;
    const arr = [...draft.images];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setDraft({ ...draft, images: arr });
  };

  // ───── save with validation + undo ─────
  const saveDetail = () => {
    if (!editing || !draft) return;
    const name = draft.name.trim();
    if (!name) { setDraftError(t.admin.products.nameRequired); return; }

    const sku = draft.sku.trim();
    if (!sku) { setDraftError(t.admin.products.skuRequired); return; }
    if (!SKU_RE.test(sku)) { setDraftError(t.admin.products.skuInvalid); return; }
    const dup = products.find((p) => p.id !== editing.id && p.sku === sku);
    if (dup) { setDraftError(t.admin.products.skuDuplicate); return; }

    const price = Number(draft.price);
    if (Number.isNaN(price) || price < 0) { setDraftError(t.admin.products.priceInvalid); return; }

    let comparePrice: number | undefined;
    if (draft.comparePrice.trim()) {
      const cp = Number(draft.comparePrice);
      if (Number.isNaN(cp) || cp < price) { setDraftError(t.admin.products.comparePriceInvalid); return; }
      comparePrice = cp;
    }

    let cost: number | undefined;
    if (draft.cost.trim()) {
      const c = Number(draft.cost);
      if (Number.isNaN(c) || c < 0) { setDraftError(t.admin.products.priceInvalid); return; }
      cost = c;
    }

    const stock = Number(draft.stock);
    if (Number.isNaN(stock) || stock < 0) { setDraftError(t.admin.products.stockInvalid); return; }

    const stockAlert = Number(draft.stockAlert);
    if (Number.isNaN(stockAlert) || stockAlert < 0) { setDraftError(t.admin.products.stockAlertInvalid); return; }

    const seoSlug = draft.seoSlug.trim();
    if (seoSlug && !SLUG_RE.test(seoSlug)) { setDraftError(t.admin.products.seoSlugInvalid); return; }

    const images = draft.images.length ? draft.images : [editing.cover];
    const cover = images[0];

    const snapshot: AdminProduct = { ...editing };

    const updated: AdminProduct = {
      ...editing,
      name,
      sku,
      category: draft.category.trim() || '未分类',
      price,
      comparePrice,
      cost,
      stock,
      stockAlert,
      description: draft.description,
      images,
      cover,
      seoSlug: seoSlug || undefined,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    setProducts(products.map((p) => (p.id === editing.id ? updated : p)));

    // schedule undo
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const timer = window.setTimeout(() => setUndo(null), 5000);
    undoTimerRef.current = timer;
    setUndo({ row: snapshot, timer });

    closeDetail();
  };

  const undoSave = () => {
    if (!undo) return;
    const { row } = undo;
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    setProducts(products.map((p) => (p.id === row.id ? row : p)));
    setUndo(null);
  };

  const toggleStatus = (id: number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, status: !p.status } : p)));
  };

  const addProduct = () => {
    const id = products.length === 0 ? 1 : Math.max(...products.map((p) => p.id)) + 1;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const sku = `NEW-${id}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    setProducts([
      ...products,
      {
        id,
        name: t.admin.products.colName + ' #' + id,
        sku,
        category: '数码电子',
        price: 0,
        comparePrice: undefined,
        cost: undefined,
        stock: 0,
        stockAlert: 5,
        description: '',
        images: ['📦'],
        cover: '📦',
        status: true,
        seoSlug: undefined,
        created_at: now,
        updated_at: now,
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
    else setSelected(new Set(products.map((p) => p.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkSetStatus = (status: boolean) => {
    const ids = new Set(selected);
    setProducts(products.map((p) => (ids.has(p.id) ? { ...p, status } : p)));
  };

  const requestDelete = (ids: number[]) => setDeletingIds(ids);
  const confirmDelete = () => {
    if (!deletingIds) return;
    const idSet = new Set(deletingIds);
    setProducts(products.filter((p) => !idSet.has(p.id)));
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

      <DataTable minWidth="980px">
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
            <Th>{t.admin.products.colSku}</Th>
            <Th>{t.admin.products.colName}</Th>
            <Th>{t.admin.products.colCat}</Th>
            <Th>{t.admin.products.colPrice}</Th>
            <Th>{t.admin.products.colComparePrice}</Th>
            <Th>{t.admin.products.colStock}</Th>
            <Th>{t.admin.products.colStockAlert}</Th>
            <Th>{t.admin.products.colStatus}</Th>
            <Th>{t.admin.products.colAction}</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <Td colSpan={12} className="text-center text-neutral-500 py-6">
                {t.admin.products.empty}
              </Td>
            </tr>
          ) : (
            products.map((p) => (
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
                <Td className="font-mono text-[11px] text-neutral-600" title={p.sku}>{p.sku}</Td>
                <Td className="font-semibold text-neutral-900 max-w-[180px] truncate" title={p.name}>{p.name}</Td>
                <Td>
                  <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-neutral-100 text-neutral-700">
                    {p.category}
                  </span>
                </Td>
                <Td className="font-bold tabular-nums text-orange-700">${p.price}</Td>
                <Td className="text-neutral-500 tabular-nums line-through">
                  {p.comparePrice != null ? `$${p.comparePrice}` : '—'}
                </Td>
                <Td>
                  <span className={p.stock === 0 ? 'text-rose-600 font-bold' : p.stock <= p.stockAlert ? 'text-amber-700 font-bold' : ''}>
                    {p.stock}
                  </span>
                </Td>
                <Td className="text-neutral-500 tabular-nums text-[11.5px]">≤{p.stockAlert}</Td>
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
      <Modal open={editingId !== null} title={t.admin.products.detailEdit} onClose={closeDetail} width="640px">
        {editing && draft && (
          <div>
            {/* Summary panel */}
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
                {editing.updated_at && editing.updated_at !== editing.created_at && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">{t.admin.products.colUpdatedAt}</dt>
                    <dd className="text-neutral-700">{editing.updated_at}</dd>
                  </div>
                )}
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
                {editing.cost != null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">{t.admin.products.colCost}</dt>
                    <dd className="text-neutral-700 tabular-nums">${editing.cost}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="d-name" className="block text-[12px] font-semibold text-neutral-700 mb-1">
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
                  <label htmlFor="d-sku" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.detailSku} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="d-sku"
                    type="text"
                    value={draft.sku}
                    onChange={(e) => setDraft({ ...draft, sku: e.target.value.toUpperCase() })}
                    placeholder="NB-PRO-14-2026"
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                  <label htmlFor="d-compare" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.detailComparePrice}
                  </label>
                  <input
                    id="d-compare"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.comparePrice}
                    onChange={(e) => setDraft({ ...draft, comparePrice: e.target.value })}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="d-cost" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.detailCost}
                  </label>
                  <input
                    id="d-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.cost}
                    onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label htmlFor="d-alert" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                    {t.admin.products.detailStockAlert}
                  </label>
                  <input
                    id="d-alert"
                    type="number"
                    min="0"
                    step="1"
                    value={draft.stockAlert}
                    onChange={(e) => setDraft({ ...draft, stockAlert: e.target.value })}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
              </div>

              {/* Images chip input */}
              <div>
                <label htmlFor="d-img-input" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                  {t.admin.products.detailImages}
                </label>
                <div className="flex gap-2">
                  <input
                    id="d-img-input"
                    type="text"
                    value={imgInput}
                    onChange={(e) => setImgInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addImage(); }
                    }}
                    placeholder={t.admin.products.detailImagesPh}
                    className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="px-3 py-2 text-[12px] font-bold rounded-md bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                  >
                    +
                  </button>
                </div>
                {draft.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.images.map((img, idx) => (
                      <div
                        key={`${img}-${idx}`}
                        className={`flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border text-[13px] ${
                          idx === 0 ? 'bg-orange-50 border-orange-300' : 'bg-neutral-50 border-neutral-200'
                        }`}
                      >
                        <span className="text-[16px] leading-none">
                          {/^https?:\/\//.test(img) ? '🖼️' : img}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold text-orange-700">COVER</span>
                        )}
                        <button
                          type="button"
                          onClick={() => moveImage(idx, -1)}
                          disabled={idx === 0}
                          aria-label="left"
                          className="px-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 1)}
                          disabled={idx === draft.images.length - 1}
                          aria-label="right"
                          className="px-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          aria-label="remove"
                          className="px-1 text-rose-600 hover:text-rose-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description with edit/preview tabs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-semibold text-neutral-700">
                    {t.admin.products.colDesc}
                  </label>
                  <div className="flex border border-neutral-300 rounded-md overflow-hidden text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDescTab('edit')}
                      className={`px-2.5 py-1 font-semibold ${descTab === 'edit' ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'}`}
                    >
                      {t.admin.products.detailDescEdit}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescTab('preview')}
                      className={`px-2.5 py-1 font-semibold border-l border-neutral-300 ${descTab === 'preview' ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'}`}
                    >
                      {t.admin.products.detailDescPreview}
                    </button>
                  </div>
                </div>
                {descTab === 'edit' ? (
                  <textarea
                    id="d-desc"
                    rows={4}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder={'## 卖点\n- ...\n\n## 售后\n...'}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-y"
                  />
                ) : (
                  <div
                    className="min-h-[96px] border border-neutral-200 rounded-md px-3 py-2 text-[13px] bg-neutral-50 text-neutral-800"
                    dangerouslySetInnerHTML={{ __html: draft.description ? renderMarkdown(draft.description) : '<p class="text-neutral-400">—</p>' }}
                  />
                )}
              </div>

              <div>
                <label htmlFor="d-slug" className="block text-[12px] font-semibold text-neutral-700 mb-1">
                  {t.admin.products.detailSeoSlug}
                </label>
                <input
                  id="d-slug"
                  type="text"
                  value={draft.seoSlug}
                  onChange={(e) => setDraft({ ...draft, seoSlug: e.target.value.toLowerCase() })}
                  placeholder="notebook-pro-14"
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
                <p className="mt-1 text-[11px] text-neutral-500">{t.admin.products.detailSeoSlugHint}</p>
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
                  const p = products.find((x) => x.id === id);
                  return p ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="text-[14px]">{p.cover}</span>
                      <span className="font-mono text-neutral-500">#{p.id}</span>
                      <span className="font-mono text-[11px] text-neutral-500">{p.sku}</span>
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

      {/* Undo toast */}
      {undo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-neutral-900 text-white text-[13px] rounded-lg shadow-lg"
        >
          <span>{t.admin.products.savedToast.replace('{id}', String(undo.row.id))}</span>
          <button
            type="button"
            onClick={undoSave}
            className="px-2.5 py-1 text-[12px] font-bold rounded bg-amber-400 text-neutral-900 hover:bg-amber-300 transition-colors"
          >
            {t.admin.products.undoCta}
          </button>
        </div>
      )}
    </div>
  );
}
