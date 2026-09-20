// AnnouncementBar.tsx — TS port
import * as T from './types';

export interface AnnouncementBarProps {
  text?: string;
}

export default function AnnouncementBar({ text }: AnnouncementBarProps) {
  return (
    <div className="bg-[var(--gray-100)] border-y border-[var(--gray-200)] py-2 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 text-[13px]">
        <span className="px-2 py-0.5 bg-[var(--primary)] text-white rounded text-[11px] font-semibold shrink-0">
          {'__COPY_announcement.tag__'}
        </span>
        <span className="truncate text-[var(--gray-700)]">{text || '__COPY_announcement.text__'}</span>
      </div>
    </div>
  );
}