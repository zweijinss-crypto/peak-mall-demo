import { useT } from '@/lib/ref-translations.tsx';

export interface AnnouncementBarProps {
  text?: string;
}

export default function AnnouncementBar({ text }: AnnouncementBarProps) {
  const { t } = useT();
  return (
    <div className="bg-[var(--ref-gray-100)] border-y border-[var(--ref-gray-200)] py-2 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 text-[13px]">
        <span className="px-2 py-0.5 bg-[var(--ref-primary)] text-white rounded text-[11px] font-semibold shrink-0">
          {t('announcement.tag')}
        </span>
        <span className="truncate text-[var(--ref-gray-700)]">{text || t('announcement.text')}</span>
      </div>
    </div>
  );
}