'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useT } from '@/lib/use-t';
import { PRODUCTS } from '@/data/products';

const CATEGORY_THEMES = [
  {
    key: '数码电子',
    bg: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
    accent: '#60a5fa',
    emoji: '💻',
  },
  {
    key: '家用电器',
    bg: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
    accent: '#fb923c',
    emoji: '🤖',
  },
] as const;

/** Map the i18n label back to the underlying category key (stored on products). */
function labelFromKey(home: Record<string, unknown>, k: '数码电子' | '家用电器'): string {
  return k === '数码电子' ? ((home.cat1 as string) ?? k) : ((home.cat2 as string) ?? k);
}

/**
 * CategoryGrid - 大卡片分类入口,每个分类一张大图 + 商品数 + hover 微动效
 */
const CategoryGrid: FC = () => {
  const router = useRouter();
  const t = useT();
  const home = t.home as Record<string, unknown> & { catOfItems?: (n: number) => string };
  const descMap: Record<string, string> = {
    '数码电子': (home.cat1Desc as string) ?? '',
    '家用电器': (home.cat2Desc as string) ?? '',
  };
  return (
    <section className="max-w-shell mx-auto px-5 py-12">
      <div className="flex items-end justify-between mb-7">
        <div>
          <div className="text-[12px] font-extrabold tracking-[3px] uppercase text-ink-500 mb-2">{home.browseByCat as string}</div>
          <h2 className="text-[28px] md:text-[32px] font-extrabold text-ink-900 leading-tight">{home.exploreCategories as string}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CATEGORY_THEMES.map((c) => {
          const label = labelFromKey(home, c.key);
          const count = PRODUCTS.filter((p) => p.category === c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => router.push(`/?cat=${encodeURIComponent(c.key)}`)}
              className="group relative h-[280px] md:h-[340px] rounded-2xl overflow-hidden text-left text-white shadow-soft hover:shadow-float hover:-translate-y-1 transition-all"
              style={{ background: c.bg }}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-20" />
              <div
                className="absolute -right-12 -top-12 w-[240px] h-[240px] rounded-full opacity-30 group-hover:scale-125 group-hover:opacity-50 transition-all duration-700"
                style={{ background: c.accent }}
              />
              <div className="relative h-full flex flex-col justify-between p-7 md:p-9">
                <div>
                  <div className="text-[11px] tracking-[3px] uppercase opacity-80 mb-3">{home.catOfItems ? home.catOfItems(count) : `${count} items`}</div>
                  <div className="text-[36px] md:text-[44px] font-extrabold leading-none mb-3">{label}</div>
                  <div className="text-[14px] opacity-85 max-w-[280px] leading-relaxed">{descMap[c.key] ?? ''}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 bg-white text-ink-900 px-4 py-2 rounded-md text-[12.5px] font-bold tracking-wide group-hover:gap-3 transition-all">
                    {(t.hero as Record<string, string>).ctaPrimary}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-[80px] opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500">{c.emoji}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
