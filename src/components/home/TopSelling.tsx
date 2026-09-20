'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { FC } from 'react';
import type { Product } from '@/components/peak-mall/types';
import { useT } from '@/lib/use-t';
import { useCategoryLabel } from '@/lib/use-category-label';

export interface TopSellingProps {
  products: Product[];
}

/**
 * TopSelling - 热销榜 TOP 5:排行榜风,前 3 名金/银/铜特殊样式
 */
const TopSelling: FC<TopSellingProps> = ({ products }) => {
  const router = useRouter();
  const cp = useT();
  const top = [...products].sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 5);
  const podiumColors = ['#fbbf24', '#cbd5e1', '#d97706']; // gold / silver / bronze
  // Pre-compute localized labels for each unique category (top-level hook
  // calls only — map callbacks must not call hooks).
  const labelElec = useCategoryLabel('数码电子');
  const labelAppl = useCategoryLabel('家用电器');
  const labels: Record<string, string> = { '数码电子': labelElec, '家用电器': labelAppl };

  return (
    <section className="bg-white py-12 border-y border-ink-100">
      <div className="max-w-shell mx-auto px-5">
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="text-[12px] font-extrabold tracking-[3px] uppercase text-accent-rose mb-2">🏆 {cp.topSelling.label}</div>
            <h2 className="text-[28px] md:text-[32px] font-extrabold text-ink-900 leading-tight">{cp.topSelling.title}</h2>
          </div>
          <Link href="/shop-hot" className="text-[13px] font-semibold text-orange-700 hover:text-orange-800 cursor-pointer">
            {cp.topSelling.viewAll} →
          </Link>
        </div>

        <div className="space-y-3">
          {top.map((p, i) => {
            const isPodium = i < 3;
            const color = podiumColors[i];
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/shop/${p.id}`)}
                className="w-full group flex items-center gap-4 p-3 bg-ink-50 hover:bg-primary-50 rounded-xl transition-colors text-left"
              >
                {/* Rank */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-[20px] font-extrabold ${isPodium ? 'text-white shadow-md' : 'bg-white text-ink-700 border border-ink-200'}`}
                  style={isPodium ? { background: color } : undefined}
                >
                  {i + 1}
                </div>

                {/* Cover */}
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-ink-100 overflow-hidden">
                  {p.cover?.startsWith('/') || p.cover?.startsWith('http') ? (
                    <Image src={p.cover} alt={p.name} width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[24px]">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink-900 truncate group-hover:text-primary transition-colors">{p.name}</div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5 flex items-center gap-2">
                    <span>{labels[p.category] ?? p.category}</span>
                    <span className="w-1 h-1 bg-ink-300 rounded-full" />
                    <span>{cp.topSelling.sold} {Math.floor(Number(p.stock) * 1.3)}</span>
                  </div>
                </div>

                {/* Price + reviews */}
                <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                  <div className="text-[16px] font-extrabold text-orange-700">${p.price}</div>
                  <div className="text-[11px] text-accent-gold mt-0.5">★★★★★ <span className="text-ink-500">{(4.5 + i * 0.1).toFixed(1)}</span></div>
                </div>

                <div className="text-ink-300 group-hover:text-primary group-hover:translate-x-1 transition-all">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TopSelling;
