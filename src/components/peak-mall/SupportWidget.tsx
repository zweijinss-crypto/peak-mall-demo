'use client';

import type { FC } from 'react';

export interface SupportWidgetProps {
  /** Telegram handle (without @). Click → opens t.me/<handle>. */
  telegram?: string;
  /** Office hours line. */
  hours?: string;
  /** Brand short name shown in the avatar. */
  brand?: string;
  /** Agent display name. */
  agent?: string;
}

/**
 * SupportWidget — fixed bottom-right floating card.
 *
 * Mirrors the source peak-mall.com SPA footer (avatar + hours + Telegram
 * CTA). Renders as a small toggle in the bottom-right corner. Click → opens
 * the Telegram handle in a new tab.
 */
const SupportWidget: FC<SupportWidgetProps> = ({
  telegram = 'MementoCare',
  hours,
  brand = 'MC',
  agent = 'Support',
}) => {
  const href = `https://t.me/${telegram}`;
  const hoursLabel =
    hours ?? 'Office hours 13:00 - 23:30';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${agent} (Telegram @${telegram})`}
      className="fixed bottom-5 right-5 z-50 group flex items-center gap-3 bg-white border border-ink-200 shadow-float rounded-2xl pl-3 pr-4 py-2.5 hover:shadow-2xl hover:-translate-y-0.5 transition-all max-w-[300px]"
    >
      <span
        aria-hidden="true"
        className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-[12px] font-extrabold flex items-center justify-center flex-shrink-0"
      >
        {brand.slice(0, 2).toUpperCase()}
      </span>
      <span className="flex flex-col leading-tight min-w-0">
        <span className="text-[13px] font-bold text-ink-900 truncate">{agent}</span>
        <span className="text-[11px] text-ink-500 truncate">🕐 {hoursLabel}</span>
      </span>
      <span className="ml-2 px-2.5 py-1 bg-ink-900 text-white text-[10.5px] font-extrabold tracking-wide rounded group-hover:bg-orange-700 transition-colors">
        SEND
      </span>
    </a>
  );
};

export default SupportWidget;