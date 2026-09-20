'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { usePeakStore } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { useCategoryLabel } from '@/lib/use-category-label';
import type { Product } from '@/components/peak-mall/types';

export type ProductGridMode = 'all' | 'new' | 'hot';

export interface ProductGridProps {
  products: Product[];
  mode: ProductGridMode;
  /** Show category filter chips. Default true. */
  showCategory?: boolean;
}

const DISCOUNT = 0.6; // -60% (mirrors the source-SPA product card)

/**
 * ProductGrid — generic grid for the 3 source-SPA product pages:
 *   /shop-all (mode='all'), /shop-new (mode='new'), /shop-hot (mode='hot').
 *
 * Local-only interaction (localStorage wishlist + add-to-cart store action);
 * no API. All copy + category labels come from useT(); category filter is
 * optional and can be hidden via `showCategory`.
 */
export default function ProductGrid({ products, mode, showCategory = true }: ProductGridProps) {
  const t = useT();
  const copy = t.shop.shopAll;
  const searchParams = useSearchParams();

  const [activeCat, setActiveCat] = useState<string>(copy.catAll);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const addCart = usePeakStore((s) => s.addToCart);
  const toggleWish = usePeakStore((s) => s.toggleWish);

  const title =
    mode === 'new' ? t.shop.shopNew.title : mode === 'hot' ? t.shop.shopHot.title : copy.title;
  const subtitle =
    mode === 'new'
      ? t.shop.shopNew.subtitle
      : mode === 'hot'
      ? t.shop.shopHot.subtitle
      : copy.subtitle;

  const categoryLabels = [copy.catAll, copy.catElectronics, copy.catAppliances];
  const electronicsLabel = useCategoryLabel('数码电子');
  const appliancesLabel = useCategoryLabel('家用电器');
  const productLabels: Record<string, string> = {
    '数码电子': electronicsLabel,
    '家用电器': appliancesLabel,
  };

  // sort by mode
  let sorted = [...products];
  if (mode === 'new') {
    sorted = [...products].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  } else if (mode === 'hot') {
    sorted = [...products].sort((a, b) => Number(b.stock) - Number(a.stock));
  }

  // URL ?cat=... wins over local state on first paint (CategoryGrid 立即选购 link)
  useEffect(() => {
    const urlCat = searchParams.get('cat');
    if (!urlCat) return;
    const labels = [copy.catAll, copy.catElectronics, copy.catAppliances];
    const matched = labels.find((l) => encodeURIComponent(l) === urlCat || l === urlCat);
    if (matched && matched !== activeCat) setActiveCat(matched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // category filter — when label switches due to locale, reset to "All"
  if (showCategory && activeCat !== copy.catAll) {
    sorted = sorted.filter((p) => p.category === activeCat);
  }
  // search
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    sorted = sorted.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }
  // price sort
  if (sort === 'price-asc') sorted = [...sorted].sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === 'price-desc') sorted = [...sorted].sort((a, b) => Number(b.price) - Number(a.price));

  return (
    <section className="max-w-shell mx-auto px-5 py-8">
      <header className="mb-6">
        <h1 className="text-[28px] font-extrabold text-ink-900 leading-tight">{title}</h1>
        <h2 className="sr-only">{copy.title}</h2>
        {subtitle && <p className="text-[13.5px] text-ink-500 mt-1.5">{subtitle}</p>}
      </header>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-ink-100 p-4 mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchAria}
          className="flex-1 min-w-[200px] px-3 py-2 border border-ink-200 rounded-md text-[13.5px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
        {showCategory && (
          <div className="flex gap-2">
            {categoryLabels.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-colors ${
                  activeCat === c ? 'bg-orange-700 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label={copy.sortAria}
          className="px-3 py-2 border border-ink-200 rounded-md text-[13px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
        >
          <option value="default">{copy.sortDefault}</option>
          <option value="price-asc">{copy.sortPriceAsc}</option>
          <option value="price-desc">{copy.sortPriceDesc}</option>
        </select>
        <span className="text-[12.5px] text-ink-500">{copy.count(sorted.length)}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
          <div className="text-[64px] mb-4">📦</div>
          <div className="text-[18px] font-bold text-ink-900 mb-2">{copy.emptyTitle}</div>
          <div className="text-[13.5px] text-ink-500">{copy.emptyDesc}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((p, i) => (
            <article
              key={p.id}
              className="group bg-white rounded-xl overflow-hidden border border-ink-100 hover:shadow-float hover:-translate-y-1 transition-all relative"
            >
              <Link
                href={`/shop/${p.id}`}
                className="block w-full aspect-square bg-ink-100 relative overflow-hidden"
              >
                {p.cover?.startsWith('/') || p.cover?.startsWith('http') ? (
                  <Image
                    src={p.cover}
                    alt={p.name}
                    width={320}
                    height={320}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    priority={i < 4}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[64px]">📦</div>
                )}
                <span className="absolute top-2 left-2 bg-accent-rose text-white text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded pointer-events-none">
                  {copy.discountBadge}
                </span>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); toggleWish(p.id); }}
                aria-label={copy.wishAria}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-ink-700 hover:text-accent-rose hover:bg-white text-[14px] z-[2]"
              >
                ♡
              </button>
              <div className="p-3.5">
                <h3 className="text-[13px] font-semibold text-ink-900 line-clamp-2 leading-snug mb-2 min-h-[34px]">
                  <Link href={`/shop/${p.id}`} className="hover:text-orange-700 transition-colors">
                    {p.name}
                  </Link>
                </h3>
                <div className="text-[11px] text-ink-500 mb-1.5">{productLabels[p.category] ?? p.category}</div>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-orange-700 text-[18px] font-extrabold">${Number(p.price).toFixed(2)}</span>
                  <span className="text-ink-600 text-[11.5px] line-through">${(Number(p.price) / (1 - DISCOUNT)).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => addCart({ ...p, price: Number(p.price) })}
                  className="w-full py-2 bg-orange-700 hover:bg-orange-800 text-white text-[12.5px] font-bold rounded-md transition-colors"
                >
                  {copy.addToCart}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
