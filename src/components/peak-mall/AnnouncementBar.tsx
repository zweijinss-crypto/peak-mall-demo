'use client';

import type { FC } from 'react';
import { useT } from '@/lib/use-t';

export interface AnnouncementBarProps {
  /** Tag label (e.g. "Notice" / "公告"). */
  tag?: string;
  /** Scrolling text (single line). */
  text?: string;
  /** CSS animation duration in seconds. */
  duration?: number;
}

/**
 * AnnouncementBar - Top scrolling notice bar (refer to source site .roll).
 * Defaults are locale-aware via useT().
 */
const AnnouncementBar: FC<AnnouncementBarProps> = ({
  tag,
  text,
  duration = 28,
}) => {
  const t = useT();
  const finalTag = tag ?? t.announcement.defaultTag;
  const finalText = text ?? t.announcement.defaultText;

  return (
    <div className="bg-orange-50 border-b border-orange-100 text-[12.5px] text-orange-900 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 h-9 flex items-center gap-4">
        <span className="px-2.5 py-0.5 bg-orange-700 text-white text-[10.5px] font-extrabold tracking-wider rounded">
          {finalTag}
        </span>
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          <div
            className="absolute whitespace-nowrap animate-roll will-change-transform"
            style={{ animationDuration: `${duration}s` }}
          >
            {finalText}　·　{finalText}　·　{finalText}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes roll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-roll { animation: roll linear infinite; }
      `}</style>
    </div>
  );
};

export default AnnouncementBar;
