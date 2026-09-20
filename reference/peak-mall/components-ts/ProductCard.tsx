// ProductCard.tsx — TS port
import type { AuthHandlers, CartLineItem, CurrencyCode, Category, ProductWithText, StockStatus } from './types';

export interface ProductCardProps {
  product: ProductWithText;
  href?: string;
  onAddToCart?: (p: ProductWithText) => void;
}

const STOCK_BADGE: Record<StockStatus, { txt: string; cls: string }> = {
  in_stock: { txt: '__COPY_product.stock.in__', cls: 'bg-green-100 text-[var(--success)]' },
  low:      { txt: '__COPY_product.stock.low__', cls: 'bg-yellow-100 text-[#a16207]' },
  out:      { txt: '__COPY_product.stock.out__', cls: 'bg-red-100 text-[var(--danger)]' },
};

export default function ProductCard({ product, onAddToCart, href }: ProductCardProps) {
  const {
    id, name, price, subtitle, coverEmoji, cover,
    stockStatus = 'in_stock', currency = 'USD',
  } = product;
  const badge = STOCK_BADGE[stockStatus];

  return (
    <a
      href={href || `/product/${id}`}
      className="bg-white border border-[var(--gray-200)] rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,.09)] hover:border-[var(--primary)]"
    >
      <div
        className="h-[120px] flex items-center justify-center text-[46px]"
        style={{
          backgroundImage: cover ? `url(${cover})` : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!cover && (coverEmoji || '__COPY_product.coverFallback__')}
      </div>

      <div className="px-3.5 py-3 flex-1 flex flex-col">
        <div className="text-[13px] font-semibold leading-snug line-clamp-2">{name}</div>
        <div className="text-[var(--danger)] text-[17px] font-bold mt-1.5">
          {currency} {price.toFixed(2)}
        </div>
        {subtitle && <div className="text-[11px] text-[var(--gray-500)] mt-0.5 truncate">{subtitle}</div>}
        <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${badge.cls}`}>
          {badge.txt}
        </span>
      </div>

      <div className="px-3.5 pb-3">
        <button
          onClick={(e) => { e.preventDefault(); onAddToCart?.(product); }}
          disabled={stockStatus === 'out'}
          className="w-full py-2 rounded-lg text-[13px] font-semibold transition-colors bg-[var(--primary)] text-white hover:bg-[var(--primary-d)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {'__COPY_product.addToCart__'}
        </button>
      </div>
    </a>
  );
}