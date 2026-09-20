import { useState, type FC, type MouseEvent } from 'react';
import Image from 'next/image';
import type { CurrencyCode, Product } from './types';
import { useT } from '@/lib/use-t';
import { useCategoryLabel } from '@/lib/use-category-label';

export interface ProductModalProps {
  product: Product | null;
  onClose?: () => void;
  currency?: CurrencyCode;
}

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', AUD: 'A$', CAD: 'C$',
};

function currencySymbol(c: CurrencyCode): string {
  return SYMBOLS[c] || '$';
}

/**
 * ProductModal - 商品详情弹窗 (参考源站 .modal-mask)
 */
const ProductModal: FC<ProductModalProps> = ({ product, onClose, currency = 'USD' }) => {
  const t = useT();
  const [imgErr, setImgErr] = useState(false);
  const categoryLabel = useCategoryLabel(product?.category ?? '');
  if (!product) return null;

  const isCoverUrl =
    !!product.cover &&
    (product.cover.startsWith('/') || product.cover.startsWith('http'));

  const handleBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[99] p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-[14px] p-6 w-[560px] max-w-[94vw] max-h-[88vh] overflow-auto relative">
        <button
          aria-label={t.modal.close}
          className="absolute top-3.5 right-4.5 text-[18px] text-neutral-400 hover:text-neutral-900 cursor-pointer"
          onClick={onClose}
        >
          {t.modal.closeSymbol}
        </button>

        <h2 className="text-[18px] font-bold mb-3.5">{product.name}</h2>

        <div className="w-full aspect-square bg-neutral-100 rounded-[10px] flex items-center justify-center text-[120px] overflow-hidden mb-3.5">
          {isCoverUrl && !imgErr ? (
            <Image
              src={product.cover}
              alt={product.name}
              width={800}
              height={800}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            t.modal.coverEmoji
          )}
        </div>

        <div className="flex gap-3.5 mb-3.5">
          <div>
            <div className="text-[11px] text-ink-600">{t.label.price}</div>
            <div className="text-[24px] font-extrabold text-orange-700">
              {currencySymbol(currency)}
              {Number(product.price || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-ink-600">{t.label.category}</div>
            <div className="text-[14px]">{categoryLabel}</div>
          </div>
          <div>
            <div className="text-[11px] text-ink-600">{t.label.stock}</div>
            <div className="text-[14px]">{product.stock} {t.label.pcs}</div>
          </div>
        </div>

        <div className="text-[13px] text-neutral-600 leading-[1.7] p-3 bg-neutral-50 rounded-lg">
          {product.description || t.label.noDescription}
        </div>

        <div className="mt-2.5 text-[11.5px] text-neutral-400">
          id: #{product.id} · {t.label.createdAt}{' '}
          {product.created_at && new Date(product.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
