import { useT } from '@/lib/ref-translations';
import type { CartLineItem, CurrencyCode } from './types';

export interface CartLineProps {
  item: CartLineItem;
  currency?: CurrencyCode;
  onChangeQty?: (id: CartLineItem['id'], qty: number) => void;
  onRemove?: (id: CartLineItem['id']) => void;
}

export default function CartLine({ item, onChangeQty, onRemove, currency = 'USD' }: CartLineProps) {
  const { t } = useT();
  const { id, name, price, qty = 1, coverEmoji, cover, subtitle } = item;
  const dec = () => onChangeQty?.(id, Math.max(1, qty - 1));
  const inc = () => onChangeQty?.(id, Math.min(100, qty + 1));

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-[var(--ref-gray-100)] flex-wrap">
      <div
        className="w-14 h-14 rounded-[10px] shrink-0 flex items-center justify-center text-[28px]"
        style={{
          backgroundImage: cover ? `url(${cover})` : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!cover && (coverEmoji || t('cart.coverFallback'))}
      </div>

      <div className="flex-1 min-w-[120px]">
        <div className="text-[14px] font-semibold">{name}</div>
        {subtitle && <div className="text-[12px] text-[var(--ref-gray-500)] mt-0.5">{subtitle}</div>}
        <div className="text-[var(--ref-danger)] font-bold mt-1">{currency} {price.toFixed(2)}</div>
      </div>

      <div className="flex items-center border border-[var(--ref-gray-300)] rounded-lg overflow-hidden w-[98px] shrink-0">
        <button onClick={dec} className="w-[30px] h-[30px] border-none bg-[var(--ref-gray-50)] hover:bg-[var(--ref-gray-200)] text-[var(--ref-gray-700)]">−</button>
        <span className="flex-1 text-center text-[13px]">{qty}</span>
        <button onClick={inc} className="w-[30px] h-[30px] border-none bg-[var(--ref-gray-50)] hover:bg-[var(--ref-gray-200)] text-[var(--ref-gray-700)]">+</button>
      </div>

      <div className="text-[14px] font-bold w-20 text-right">
        {currency} {(price * qty).toFixed(2)}
      </div>

      <button
        onClick={() => onRemove?.(id)}
        className="px-3 py-1 rounded-lg text-[12px] bg-[var(--ref-gray-100)] text-[var(--ref-gray-700)] hover:bg-red-100 hover:text-[var(--ref-danger)]"
        aria-label={t('cart.remove')}
      >
        {t('cart.remove')}
      </button>
    </div>
  );
}