/**
 * StatCard — KPI tile matching source site's .stat style:
 *   bg white / border 1px gray-200 / radius 12px / padding 18×20
 *   label 13px gray-500 / value 26px 700 ink-900
 *
 * Why: source dashboard uses this exact pattern across 4–5 cards; reusing
 * one component keeps spacing, typography, and tone (positive/negative/neutral)
 * consistent. Optional `accent` paints a thin left border for emphasis.
 */
import type { ReactNode } from 'react';

export type StatAccent = 'default' | 'positive' | 'warning' | 'danger';

const ACCENT_MAP: Record<StatAccent, string> = {
  default: 'border-l-transparent',
  positive: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  danger: 'border-l-rose-500',
};

const VALUE_MAP: Record<StatAccent, string> = {
  default: 'text-neutral-900',
  positive: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
};

export function StatCard({
  label,
  value,
  sub,
  accent = 'default',
  className = '',
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: StatAccent;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-neutral-200 border-l-[3px] ${ACCENT_MAP[accent]} px-5 py-[18px] ${className}`}
    >
      <div className="text-[13px] text-neutral-500 leading-tight">{label}</div>
      <div className={`text-[26px] font-bold leading-tight mt-1.5 tabular-nums ${VALUE_MAP[accent]}`}>{value}</div>
      {sub && <div className="text-[11.5px] text-neutral-500 mt-1 leading-snug">{sub}</div>}
    </div>
  );
}
