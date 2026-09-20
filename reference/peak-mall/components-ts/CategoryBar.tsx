// CategoryBar.tsx — TS port
import type { AuthHandlers, CartLineItem, CurrencyCode, Category, ProductWithText, StockStatus } from './types';

export interface CategoryBarProps {
  cats?: Category[];
  active?: string;
  onPick?: (name: string) => void;
}

export default function CategoryBar({ cats = [], active, onPick }: CategoryBarProps) {
  const items: Pick<Category, 'name'>[] = [{ name: '__COPY_category.all__' }, ...cats];
  return (
    <div className="flex flex-wrap gap-2 mb-5 justify-center">
      {items.map((c) => {
        const isActive = active === c.name;
        return (
          <button
            key={c.name}
            onClick={() => onPick?.(c.name)}
            className={[
              'px-3.5 py-1.5 border rounded-full text-[13px] cursor-pointer transition-colors',
              isActive
                ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                : 'bg-white border-[var(--gray-300)] text-[var(--gray-700)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
            ].join(' ')}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}