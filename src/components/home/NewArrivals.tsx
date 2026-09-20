'use client';

import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import type { Product } from '@/components/peak-mall/types';
import { useT } from '@/lib/use-t';

export interface NewArrivalsProps {
  products: Product[];
}

/**
 * NewArrivals - 新品上市:横向卡片 + 价格 + "NEW" 角标
 */
const NewArrivals: FC<NewArrivalsProps> = ({ products }) => {
  const router = useRouter();
  const cp = useT();
  const items = [...products].reverse().slice(0, 8);

  return (
    <section className="bg-gradient-to-br from-ink-50 via-white to-primary-50/30 py-12">
      <div className="max-w-shell mx-auto px-5">
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-extrabold tracking-[3px] uppercase text-accent-teal">✨ {cp.newArrivals.label}</span>
            </div>
            <h2 className="text-[28px] md:text-[32px] font-extrabold text-ink-900 leading-tight">{cp.newArrivals.title}</h2>
          </div>
          <a className="text-[13px] font-semibold text-orange-700 hover:text-orange-800 cursor-pointer">{cp.newArrivals.viewAll} →</a>
        </div>

        {/* Horizontal scroll */}
        <div className="overflow-x-auto -mx-5 px-5 pb-4 scrollbar-thin">
          <div className="flex gap-4 min-w-min">
            {items.map((p, i) => (
              <button
                key={p.id}
                onClick={() => router.push(`/shop/${p.id}`)}
                className="group flex-shrink-0 w-[220px] md:w-[240px] bg-white rounded-xl overflow-hidden text-left shadow-soft hover:shadow-float hover:-translate-y-1 transition-all"
              >
                <div className="relative aspect-square bg-ink-100">
                  {p.cover?.startsWith('/') || p.cover?.startsWith('http') ? (
                    <img src={p.cover} alt={p.name} loading="lazy" width="320" height="320" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[64px]">📦</div>
                  )}
                  <div className="absolute top-2 left-2 bg-teal-700 text-white text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded">
                    {cp.newArrivals.badge}
                  </div>
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-ink-700 hover:text-accent-rose hover:bg-white text-[14px]">
                    ♡
                  </div>
                  {i === 0 && (
                    <div className="absolute bottom-2 left-2 bg-amber-700 text-white text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded">
                      {cp.newArrivals.hot}
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="text-[12.5px] font-semibold text-ink-900 line-clamp-2 leading-snug mb-2 min-h-[34px]">{p.name}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-orange-700 text-[18px] font-extrabold">${p.price}</span>
                    <span className="text-ink-600 text-[11.5px] line-through">${(Number(p.price) * 1.4).toFixed(2)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
