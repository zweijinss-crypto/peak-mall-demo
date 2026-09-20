'use client';

import { useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { CurrencyCode, Product } from './types';
import { useT } from '@/lib/use-t';
import { usePeakStore } from '@/lib/store';
import { useCategoryLabel } from '@/lib/use-category-label';

export interface ProductCardProps {
  product: Product;
  onClick?: (id: number) => void;
  currency?: CurrencyCode;
}

const COVER_EMOJI = '📦';


const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', AUD: 'A$', CAD: 'C$',
};

function currencySymbol(c: CurrencyCode): string {
  return SYMBOLS[c] || '$';
}

const ProductCard: FC<ProductCardProps> = ({ product, onClick, currency = 'USD' }) => {
  const t = useT();
  const router = useRouter();
  const categoryLabel = useCategoryLabel(product.category);
  const [imgErr, setImgErr] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addToCart = usePeakStore((s) => s.addToCart);
  const isWished = usePeakStore((s) => s.wishlist.some((w) => w.id === product.id));
  const toggleWish = usePeakStore((s) => s.toggleWish);

  const p = Number(product.price || 0);
  const old = (p * 2.5).toFixed(2);
  const isCoverUrl =
    !!product.cover &&
    (product.cover.startsWith('/') || product.cover.startsWith('http'));

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: p, cover: product.cover }, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleWish = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWish(product.id);
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: p, cover: product.cover }, 1);
    router.push('/cart');
  };

  return (
    <article
      onClick={() => onClick?.(product.id)}
      className="group bg-white rounded-[10px] overflow-hidden cursor-pointer border border-transparent hover:border-neutral-200 hover:shadow-[0_10px_25px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
        {isCoverUrl && !imgErr ? (
          <Image
            src={product.cover}
            alt={product.name}
            width={400}
            height={400}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
          />
        ) : (
          <div className="text-[64px]">{COVER_EMOJI}</div>
        )}
        <button
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={handleWish}
          className={`absolute top-2.5 right-2.5 w-[34px] h-[34px] rounded-full shadow-md text-[16px] transition-colors ${
            isWished
              ? 'bg-rose-500 text-white'
              : 'bg-white/95 text-neutral-700 hover:bg-orange-500 hover:text-white'
          }`}
        >
          {isWished ? t.card.wishlistOn : t.card.wishlistOff}
        </button>
        <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 group-hover:bottom-0 -bottom-11 transition-all duration-200 z-[3]">
          <button
            className="flex-1 bg-neutral-900 text-white text-[12.5px] font-semibold py-3 border-r border-neutral-700 hover:bg-neutral-700 transition-colors duration-150"
            onClick={handleAdd}
          >
            {justAdded ? t.card.addedToCart : t.cta.addToCart}
          </button>
          <button
            className="flex-1 bg-orange-700 text-white text-[12.5px] font-semibold py-3 hover:bg-orange-800 transition-colors duration-150"
            onClick={handleBuy}
          >
            {t.cta.buyNow}
          </button>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 mb-2 text-[11.5px]">
          <span className="text-amber-400 tracking-wider">★★★★★</span>
          <span className="text-orange-700 font-bold">4.9</span>
          <span className="flex-1" />
          <span className="text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full text-[11px] max-w-[96px] truncate">
            {categoryLabel}
          </span>
        </div>
        <h3 className="text-[14.5px] font-semibold text-neutral-900 mb-2.5 leading-snug line-clamp-2 min-h-[42px] tracking-[-0.005em]">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-orange-700 text-[17px] font-extrabold">
            {currencySymbol(currency)}{p.toFixed(2)}
          </span>
          <span className="text-ink-600 text-[12.5px] line-through">
            {currencySymbol(currency)}{old}
          </span>
          <span className="ml-auto bg-orange-100 text-orange-700 text-[11px] font-extrabold px-1.5 py-0.5 rounded">
            -60%
          </span>
        </div>
        <div className="text-[12px] text-ink-600 mt-1.5 flex justify-between">
          <span
            className={`font-semibold ${
              Number(product.stock) > 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {Number(product.stock) > 0
              ? t.label.inStock
              : t.label.outOfStock}
          </span>
          <span>
            {product.stock} {t.label.pcs}
          </span>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
