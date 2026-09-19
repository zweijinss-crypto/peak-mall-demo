import type { FC } from 'react';
import { COPY } from '@/lib/copy';

/**
 * TrustStrip - 信任条:4 个数据徽章(不是图标,是数字)
 */
const TrustStrip: FC = () => {
  const items = [
    { value: '28', label: COPY.hero.trust.countries, suffix: COPY.hero.trust.countryUnit },
    { value: '24/7', label: COPY.hero.trust.support, suffix: COPY.hero.trust.supportUnit },
    { value: '7', label: COPY.hero.trust.return, suffix: COPY.hero.trust.returnUnit },
    { value: '100%', label: COPY.hero.trust.authentic, suffix: COPY.hero.trust.authenticUnit },
  ];

  return (
    <section className="bg-white border-y border-ink-100">
      <div className="max-w-shell mx-auto px-5 py-7 grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary flex items-center justify-center text-[18px] font-extrabold flex-shrink-0">
              {it.value.slice(0, 1)}
            </div>
            <div>
              <div className="text-[20px] font-extrabold text-ink-900 leading-none">{it.value}{it.suffix}</div>
              <div className="text-[12px] text-ink-500 mt-1">{it.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustStrip;
