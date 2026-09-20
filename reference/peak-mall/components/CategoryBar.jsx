// CategoryBar.jsx
// 分类 chip 横排 — 原站 .catbar / .cat 结构
// props: cats: [{name, count?}]; active: string; onPick(name)
// 红线: 不含 USDT/分销/邀请码任何痕迹

export default function CategoryBar({ cats = [], active, onPick }) {
  const items = [{ name: '__COPY_category.all__' }, ...cats];
  return (
    <div className="flex flex-wrap gap-2 mb-5 justify-center">
      {items.map((c) => (
        <button
          key={c.name}
          onClick={() => onPick?.(c.name)}
          className={[
            'px-3.5 py-1.5 border rounded-full text-[13px] cursor-pointer transition-colors',
            active === c.name
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
              : 'bg-white border-[var(--gray-300)] text-[var(--gray-700)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
          ].join(' ')}
        >
          {c.name}
          {typeof c.count === 'number' && (
            <span className="ml-1 text-[11px] opacity-70">{c.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}