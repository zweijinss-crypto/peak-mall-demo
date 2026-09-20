import type { ReactNode } from 'react';

type StatCell = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'accent' | 'muted';
};

type Accent = 'orange' | 'emerald';

type PageBannerProps = {
  title: string;
  subtitle?: string;
  stats?: StatCell[];
  trailing?: ReactNode;
  /** Accent stripe color. Default orange (user-facing). Use emerald for admin. */
  accent?: Accent;
};

/**
 * Top banner shared by profile / orders / cart / commissions / withdraw / etc.
 * Same accent rule as profile banner: 1px orange top edge, white card, ink border.
 * Stats render as a horizontally divided strip on the right when present.
 */
export function PageBanner({ title, subtitle, stats, trailing, accent = 'orange' }: PageBannerProps) {
  const accentCls = accent === 'emerald' ? 'bg-emerald-700' : 'bg-orange-700';
  return (
    <section className="bg-white border border-ink-100 overflow-hidden mb-5">
      <div className={`h-1 ${accentCls}`} aria-hidden="true" />
      <div className="px-5 py-4 md:px-6 md:py-5 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] md:text-[22px] font-bold text-ink-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-1 text-[12px] text-ink-500">{subtitle}</div>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="flex divide-x divide-ink-100 border border-ink-100 flex-shrink-0">
            {stats.map((s, i) => (
              <div key={i} className="px-4 py-2 text-center min-w-[72px]">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 mb-0.5">
                  {s.label}
                </div>
                <div
                  className={
                    'text-[18px] font-bold leading-none tabular-nums ' +
                    (s.tone === 'accent'
                      ? 'text-orange-700'
                      : s.tone === 'muted'
                      ? 'text-ink-500'
                      : 'text-ink-900')
                  }
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}
        {trailing}
      </div>
    </section>
  );
}
