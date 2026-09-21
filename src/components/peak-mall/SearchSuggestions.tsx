'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/use-t';
import { PRODUCTS } from '@/data/products';

/**
 * S1: SearchSuggestions — 实时下拉,三段式:
 *   1. 输入时:联想 PRODUCTS.name (max 5)
 *   2. 未输入 + 焦点:最近搜索 (localStorage peak.searchHistory)
 *   3. 任何时候:热门分类 chip (静态)
 *
 * 关闭:点击外部 / Esc / 提交后 / 路由变化
 * 键盘:↑/↓ 选中, Enter 提交选中, Esc 关闭
 */

const HISTORY_KEY = 'peak.searchHistory';
const HOT_CATEGORIES = ['数码电子', '家用电器'];

function readHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeHistory(arr: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 8)));
  } catch {
    /* ignore quota / privacy mode */
  }
}

function appendHistory(term: string) {
  const t = term.trim();
  if (!t) return;
  const cur = readHistory().filter((x) => x !== t);
  cur.unshift(t);
  writeHistory(cur);
}

export { appendHistory };

export interface SearchSuggestionsProps {
  query: string;
  /** Active row index for keyboard nav. -1 = none. */
  activeIndex: number;
  onPick: (value: string) => void;
  onClose: () => void;
  /** Refs to the input we listen to for outside-click detection. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref to the form container so clicks on form don't close the dropdown. */
  formRef: React.RefObject<HTMLFormElement | null>;
  /** CJK-aware locale label for the search input. */
  searchAria: string;
  sugHistory: string;
  sugHot: string;
  sugEmpty: string;
  sugClear: string;
  sugNoHistory: string;
  clear: string;
  /** S2: inline mode for mobile dialog (no absolute + shadow, no max-height). */
  inline?: boolean;
}

const SearchSuggestions: FC<SearchSuggestionsProps> = ({
  query,
  activeIndex,
  onPick,
  onClose,
  inputRef,
  formRef,
  searchAria,
  sugHistory,
  sugHot,
  sugEmpty,
  sugClear,
  sugNoHistory,
  clear,
  inline,
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // 仅客户端读 history(SSR 永远没有 localStorage)
  useEffect(() => {
    setMounted(true);
    setHistory(readHistory());
  }, []);

  // 实时刷新 history(其他组件可能写入 — 不过当前是 ShopHeader 自家写,无外部)
  useEffect(() => {
    if (!mounted) return;
    const onStorage = () => setHistory(readHistory());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mounted]);

  // 联想:从 PRODUCTS.name 模糊匹配
  const suggestions = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PRODUCTS
      .filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({ type: 'suggest' as const, value: p.name, hint: p.category }));
  })();

  // 渲染列表(扁平,便于键盘导航)
  type Row = { type: 'suggest' | 'history' | 'hot'; value: string; hint?: string };
  const rows: Row[] = [];
  if (suggestions.length > 0) {
    rows.push(...suggestions);
  } else if (mounted && query.trim() === '') {
    if (history.length > 0) rows.push(...history.map((v) => ({ type: 'history' as const, value: v })));
  }
  // 热门总是出现在最末段
  rows.push(...HOT_CATEGORIES.map((v) => ({ type: 'hot' as const, value: v })));

  const clearHistory = () => {
    writeHistory([]);
    setHistory([]);
  };

  const router = useRouter();

  // 处理点击外部关闭
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (formRef.current?.contains(t)) return;
      if (inputRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mounted, onClose, inputRef, formRef]);

  // 总是渲染 dropdown(键盘 nav 需要 activeIndex 也保持可见)
  // 当完全没东西展示(input + 空 history + 无 hot)时也展示一行 empty hint
  const hasAny = rows.length > 0;

  return (
    <div
      ref={popoverRef}
      role="listbox"
      aria-label={searchAria}
      className={
        inline
          ? 'relative w-full bg-white rounded-md border border-neutral-200 overflow-hidden'
          : 'absolute top-full left-0 right-0 mt-2 bg-white rounded-md border border-neutral-200 shadow-lg overflow-hidden z-50 max-h-[min(420px,55dvh)] overflow-y-auto'
      }
    >
      {!hasAny && (
        <div className="px-4 py-6 text-center text-[13px] text-ink-500">{sugEmpty}</div>
      )}

      {/* 联想段标题 */}
      {suggestions.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10.5px] uppercase tracking-[1.5px] text-ink-500 font-bold bg-neutral-50 border-b border-neutral-100">
            {searchAria}
          </div>
          {rows
            .filter((r) => r.type === 'suggest')
            .map((r, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={`sug-${i}-${r.value}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onPick(r.value)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13.5px] transition-colors ${
                    active ? 'bg-orange-50 text-orange-700' : 'text-ink-900 hover:bg-ink-50'
                  }`}
                >
                  <span aria-hidden className="text-[14px] text-ink-400">🔍</span>
                  <span className="flex-1 truncate">{r.value}</span>
                  {r.hint && <span className="text-[11px] text-ink-500">{r.hint}</span>}
                </button>
              );
            })}
        </>
      )}

      {/* 历史段标题 + 清空按钮 */}
      {mounted && history.length > 0 && query.trim() === '' && (
        <>
          <div className="flex items-center justify-between px-3 py-1.5 text-[10.5px] uppercase tracking-[1.5px] text-ink-500 font-bold bg-neutral-50 border-b border-neutral-100">
            <span>{sugHistory}</span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-[11px] normal-case tracking-normal text-ink-500 hover:text-orange-700 font-medium"
              aria-label={sugClear}
            >
              {clear}
            </button>
          </div>
          {history.map((h, i) => {
            const active = i === activeIndex;
            return (
              <button
                key={`hist-${i}-${h}`}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onPick(h)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13.5px] transition-colors ${
                  active ? 'bg-orange-50 text-orange-700' : 'text-ink-900 hover:bg-ink-50'
                }`}
              >
                <span aria-hidden className="text-[14px] text-ink-400">↺</span>
                <span className="flex-1 truncate">{h}</span>
              </button>
            );
          })}
        </>
      )}

      {mounted && history.length === 0 && query.trim() === '' && suggestions.length === 0 && (
        <div className="px-4 py-3 text-center text-[12.5px] text-ink-500">{sugNoHistory}</div>
      )}

      {/* 热门段标题 */}
      {HOT_CATEGORIES.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10.5px] uppercase tracking-[1.5px] text-ink-500 font-bold bg-neutral-50 border-b border-neutral-100">
            {sugHot}
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {HOT_CATEGORIES.map((c, i) => {
              const active = activeIndex === rows.findIndex((r) => r.value === c && r.type === 'hot');
              return (
                <button
                  key={`hot-${i}-${c}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onPick(c)}
                  className={`px-3 py-1.5 text-[12.5px] font-semibold rounded-full border transition-colors ${
                    active
                      ? 'bg-orange-700 text-white border-orange-700'
                      : 'bg-white text-ink-700 border-ink-200 hover:border-orange-300 hover:text-orange-700'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchSuggestions;