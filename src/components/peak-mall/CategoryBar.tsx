import type { FC } from 'react';

export interface CategoryBarProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

/**
 * CategoryBar - 分类胶囊 (参考源站 .catbar)
 */
const CategoryBar: FC<CategoryBarProps> = ({ categories, active, onChange }) => {
  return (
    <div className="flex justify-center gap-2 flex-wrap mb-8">
      {categories.map((c) => {
        const on = c === active;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`px-5 py-2 rounded-full text-[13.5px] transition-all border-2 border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] ${
              on
                ? 'bg-orange-700 text-white border-orange-700 shadow-[0_6px_16px_rgba(194,65,12,0.32)]'
                : 'bg-white text-neutral-700 hover:text-orange-600'
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryBar;
