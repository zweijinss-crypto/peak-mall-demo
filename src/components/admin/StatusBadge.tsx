/**
 * StatusBadge — semantic tag pill aligned 1:1 with source site's
 * .tag-a / .tag-f / .tag-p / .tag-paid colors:
 *   tag-paid  已支付  bg #e7f6ec / color #1a7f37 (deep emerald, paid/active)
 *   tag-a     成功    bg #dcfce7 / color var(--success) (lighter emerald)
 *   tag-p     待处理  bg #fef9c3 / color #a16207 (warning amber)
 *   tag-f     失败    bg #fee2e2 / color var(--danger) (rose)
 *   tag-info  信息    bg #e0f2fe / color #0369a1 (sky blue)
 *   tag-mute  默认    bg #f1f5f9 / color #475569 (slate)
 *
 * Why: source site uses distinct color tokens for each semantic state. Tailwind
 * defaults (emerald-100/700, rose-100/700) are close but not pixel-equal —
 * matching the source palette keeps the 1:1 feel without losing a11y contrast
 * (all combos >= 4.5:1).
 */
import type { ReactNode } from 'react';

export type StatusKind = 'paid' | 'active' | 'pending' | 'danger' | 'info' | 'mute';

const COLOR_MAP: Record<StatusKind, string> = {
  paid: 'bg-[#e7f6ec] text-[#1a7f37]',
  active: 'bg-[#dcfce7] text-emerald-700',
  pending: 'bg-[#fef9c3] text-[#a16207]',
  danger: 'bg-[#fee2e2] text-rose-700',
  info: 'bg-[#e0f2fe] text-[#0369a1]',
  mute: 'bg-[#f1f5f9] text-[#475569]',
};

export function StatusBadge({
  kind,
  children,
  className = '',
}: {
  kind: StatusKind;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${COLOR_MAP[kind]} ${className}`}
    >
      {children}
    </span>
  );
}
