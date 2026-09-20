'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  CategoryBar,
  ProductCard,
  type CurrencyCode,
  type Product,
} from '@/components/peak-mall';
import { COPY } from '@/lib/copy';
import { useT } from '@/lib/use-t';

export interface RecommendedProps {
  products: Product[];
  categories: string[];
  currency: CurrencyCode;
}

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'rating';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'default', label: COPY.rec.sortDefault },
  { key: 'price-asc', label: COPY.rec.sortPriceAsc },
  { key: 'price-desc', label: COPY.rec.sortPriceDesc },
  { key: 'rating', label: COPY.rec.sortRating },
];

/**
 * Recommended - 推荐商品:排序下拉 + 分类切换,section header 有 渐变 accent bar
 */
const Recommended: FC<RecommendedProps> = ({ products, categories, currency }) => {
  const router = useRouter();
  const t = useT();
  const allLabel = t.nav.all;
  const [active, setActive] = useState(categories[0] ?? allLabel);
  const [sort, setSort] = useState<SortKey>('default');

  const filtered = useMemo(() => {
    let arr = active === allLabel
      ? products
      : products.filter((p) => p.category === active);
    arr = [...arr].sort((a, b) => {
      if (sort === 'price-asc') return Number(a.price) - Number(b.price);
      if (sort === 'price-desc') return Number(b.price) - Number(a.price);
      if (sort === 'rating') return Number(b.stock) - Number(a.stock);
      return 0;
    });
    return arr;
  }, [products, active, sort]);

  return (
    <section id="recommended" className="max-w-shell mx-auto px-5 py-12 scroll-mt-20">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary-light rounded-full" />
            <span className="text-[11px] font-extrabold tracking-[3px] uppercase text-ink-500">{COPY.rec.label}</span>
          </div>
          <h2 className="text-[28px] md:text-[32px] font-extrabold text-ink-900 leading-tight">{COPY.rec.title}</h2>
          <p className="text-[13.5px] text-ink-500 mt-1.5 max-w-[520px]">{COPY.rec.sub}</p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-ink-500">{COPY.rec.sortBy}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={COPY.rec.sortBy}
            className="px-3 py-2 bg-white border border-ink-200 rounded-md text-[12.5px] font-semibold text-ink-700 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category bar */}
      <div className="mb-6">
        <CategoryBar categories={categories} active={active} onChange={setActive} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            currency={currency}
            onClick={(id) => router.push(`/shop/${id}`)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-ink-500 text-[14px]">
          {COPY.rec.empty}
        </div>
      )}
    </section>
  );
};

export default Recommended;
