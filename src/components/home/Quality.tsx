'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useT } from '@/lib/use-t';

/**
 * Quality - 品质专区:双 banner 但加更多装饰元素 + hover 微动效 + 浮动装饰
 */
const Quality: FC = () => {
  const router = useRouter();
  const t = useT();
  const q = t.quality as Record<string, string | string[]>;
  const items = [
    {
      title: q.b1Title as string,
      subtitle: q.b1Sub as string,
      bullets: q.b1Bullets as string[],
      cta: q.b1Cta as string,
      bg: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 60%, #4c1d95 100%)',
      accent: '#60a5fa',
      emoji: '💻',
      path: '/?cat=' + encodeURIComponent(q.cat1 as string),
    },
    {
      title: q.b2Title as string,
      subtitle: q.b2Sub as string,
      bullets: q.b2Bullets as string[],
      cta: q.b2Cta as string,
      bg: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 60%, #431407 100%)',
      accent: '#fb923c',
      emoji: '🤖',
      path: '/?cat=' + encodeURIComponent(q.cat2 as string),
    },
  ];

  return (
    <section className="max-w-shell mx-auto px-5 py-12">
      <div className="flex items-end justify-between mb-7">
        <div>
          <div className="text-[12px] font-semibold tracking-[3px] uppercase text-ink-500 mb-2">{q.label as string}</div>
          <h2 className="text-[28px] md:text-[32px] font-bold text-ink-900 leading-tight">{q.title as string}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((it, idx) => (
          <button
            key={idx}
            onClick={() => router.push(it.path)}
            className="group relative h-[300px] md:h-[360px] rounded-2xl overflow-hidden text-left text-white"
            style={{ background: it.bg }}
          >
            <div className="relative h-full flex flex-col justify-between p-7 md:p-9">
              <div>
                <div className="text-[11px] tracking-[3px] uppercase text-white mb-3">{q.collection as string}</div>
                <h3 className="text-[26px] md:text-[32px] font-bold leading-tight mb-2.5 max-w-[300px]">
                  {it.title}
                </h3>
                <p className="text-[13.5px] text-white leading-relaxed max-w-[340px] mb-4">{it.subtitle}</p>
                <ul className="space-y-1.5">
                  {it.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-white">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-end justify-between">
                <div className="inline-flex items-center gap-2 bg-white text-ink-900 px-4 py-2 rounded-md text-[12.5px] font-bold tracking-wide">
                  {it.cta}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-[110px] opacity-30">{it.emoji}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Quality;
