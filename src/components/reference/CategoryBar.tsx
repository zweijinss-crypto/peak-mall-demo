import { useT } from '@/lib/ref-translations.tsx';
import type { Category } from './types';

export interface CategoryBarProps {
  cats?: Category[];
  active?: string;
  onPick?: (name: string) => void;
}

export default function CategoryBar({ cats = [], active, onPick }: CategoryBarProps) {
  const { t } = useT();
  const items: Pick<Category, 'name'>[] = [{ name: t('category.all') }, ...cats];
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
                ? 'bg-[var(--ref-primary)] border-[var(--ref-primary)] text-white'
                : 'bg-white border-[var(--ref-gray-300)] text-[var(--ref-gray-700)] hover:border-[var(--ref-primary)] hover:text-[var(--ref-primary)]',
            ].join(' ')}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}