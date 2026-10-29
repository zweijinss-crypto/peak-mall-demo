'use client';

import { useId, useMemo, type ReactNode } from 'react';

/**
 * AdminToolbar — shared search / filter / sort / page-size / export bar.
 *
 * Why a shared component:
 *   /admin/comm, /admin/tickets and /admin/audit are all "flat read-only
 *   ledger" views. Each one grew its own ad-hoc filter markup and they
 *   drifted apart (different placeholder styling, different empty-state
 *   handling, no pagination anywhere). Centralizing the controls keeps
 *   the three pages visually identical and makes a new ledger page a
 *   ~10-line change instead of ~80.
 *
 * Design constraints (matching the rest of the admin console):
 *   - 13px body text, neutral-200 borders, orange-500 focus rings
 *   - every control must be keyboard reachable and have an accessible name
 *   - a11y: the search input needs a real label (or aria-label) — the
 *     placeholder alone is not a reliable accessible name
 *   - the count readout uses aria-live so screen readers announce filter
 *     results changing
 *
 * All state lives in the caller. This component is purely presentational
 * plus the small bits of derived state (page slicing) it owns.
 */

export interface ToolbarFilterOption {
  value: string;
  label: string;
}

export interface ToolbarSortOption {
  value: string;
  label: string;
}

export interface AdminToolbarProps {
  /** Accessible label for the whole toolbar region. */
  label: string;
  /** Search box placeholder. */
  searchPlaceholder: string;
  /** Accessible name for the search input (placeholder is not enough). */
  searchAriaLabel: string;
  /** Current search term. */
  search: string;
  onSearchChange: (v: string) => void;

  /** Optional dropdown filter. */
  filter?: {
    ariaLabel: string;
    options: ToolbarFilterOption[];
    value: string;
    onChange: (v: string) => void;
  };

  /** Optional sort dropdown. */
  sort?: {
    ariaLabel: string;
    options: ToolbarSortOption[];
    value: string;
    onChange: (v: string) => void;
  };

  /** Number of rows currently visible after filtering. */
  resultCount: number;
  /** Total rows before filtering (used for "N / M"). */
  totalCount?: number;

  /** CSV export button. Omit to hide. */
  onExport?: () => void;
  exportLabel?: string;

  /** Optional extra controls rendered on the right (e.g. bulk bar). */
  children?: ReactNode;

  /** Controlled pagination. Omit to hide pagination. */
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  /** Copy for the pagination region. */
  paginationLabels?: {
    prev: string;
    next: string;
    page: string;      // e.g. "Page {current} of {total}"
    current: number;
    total: number;
  };
}

export function AdminToolbar({
  label,
  searchPlaceholder,
  searchAriaLabel,
  search,
  onSearchChange,
  filter,
  sort,
  resultCount,
  totalCount,
  onExport,
  exportLabel,
  children,
  page,
  pageCount,
  onPageChange,
  paginationLabels,
}: AdminToolbarProps) {
  const uid = useId();
  const searchId = `${uid}-search`;
  const filterId = `${uid}-filter`;
  const sortId = `${uid}-sort`;

  const showCount = totalCount !== undefined && totalCount !== resultCount;

  return (
    <div
      className="bg-white rounded-xl border border-neutral-200 px-4 py-3 mb-3"
      role="search"
      aria-label={label}
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">{searchAriaLabel}</label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-[240px] px-3 py-1.5 border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {filter && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={filterId} className="text-[12px] text-neutral-500 whitespace-nowrap">
              {filter.ariaLabel}
            </label>
            <select
              id={filterId}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-200 rounded-md text-[13px] bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              {filter.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {sort && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={sortId} className="text-[12px] text-neutral-500 whitespace-nowrap">
              {sort.ariaLabel}
            </label>
            <select
              id={sortId}
              value={sort.value}
              onChange={(e) => sort.onChange(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-200 rounded-md text-[13px] bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              {sort.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            </select>
          </div>
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 transition-colors"
          >
            {exportLabel ?? '导出 CSV'}
          </button>
        )}

        {children}

        <div
          className="ml-auto text-[12.5px] text-neutral-500 tabular-nums"
          aria-live="polite"
        >
          {showCount ? `${resultCount} / ${totalCount}` : `${resultCount}`}
        </div>
      </div>

      {paginationLabels && onPageChange && pageCount !== undefined && page !== undefined && pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-neutral-100">
          <span className="text-[12px] text-neutral-500 tabular-nums" aria-live="polite">
            {paginationLabels.page
              .replace('{current}', String(page))
              .replace('{total}', String(pageCount))}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {paginationLabels.prev}
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount}
              className="px-2.5 py-1 text-[12px] border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              {paginationLabels.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * useTablePage — tiny helper for "slice rows for the current page".
 *
 * Kept here (not in the pages) so every ledger page computes page
 * bounds identically. Returns the visible slice plus the page count.
 */
export function useTablePage(total: number, pageSize: number) {
  return useMemo(() => {
    const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
    return { pageCount };
  }, [total, pageSize]);
}

/**
 * slicePage — return the rows for a 1-based page number.
 */
export function slicePage<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
