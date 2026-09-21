/**
 * DataTable — wrapper for admin tables aligned with source site:
 *   table 13px / border-collapse / tabular-nums / min-width
 *   th    text-[12px] / gray-600 / uppercase tracking / padding 11×12
 *   td    padding 11×12 / border-bottom gray-100 / hover gray-50
 *
 * Why: every admin view (users / agents / orders / products / wd / invite /
 * tickets) uses this same look. Centralizing keeps hover/focus/scroll behavior
 * consistent without copying 60 lines of className to each table.
 */
import type { ReactNode } from 'react';

export function DataTable({
  children,
  minWidth = '720px',
  empty,
}: {
  children: ReactNode;
  minWidth?: string;
  empty?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
      <table
        className="w-full text-[13px] tabular-nums border-collapse"
        style={{ minWidth }}
      >
        {children}
      </table>
      {empty}
    </div>
  );
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-3 py-2.5 text-[11.5px] font-semibold tracking-wide text-neutral-600 uppercase bg-neutral-50 border-b border-neutral-200 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
  colSpan,
  muted,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  muted?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-2.5 text-[13px] border-b border-neutral-100 ${muted ? 'text-neutral-500' : 'text-neutral-800'} ${className}`}
    >
      {children}
    </td>
  );
}
