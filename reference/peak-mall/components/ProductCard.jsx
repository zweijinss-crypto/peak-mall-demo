// ProductCard.jsx
// 商品卡 — 原站 .prod 结构
// props: product = { id, name, price, subtitle?, coverEmoji?, cover?, stockStatus?, href? }
// 红线: 不含 USDT/分销/邀请码任何痕迹。price 仅展示货币金额,不携带 wallet/payout 字段。

export default function ProductCard({ product, onAddToCart, href }) {
  const {
    id, name, price, subtitle, coverEmoji, cover,
    stockStatus = 'in_stock', // in_stock | low | out
    currency = 'USD',
  } = product || {};

  const stockBadge = {
    in_stock: { txt: '__COPY_product.stock.in__', cls: 'bg-green-100 text-[var(--success)]' },
    low:      { txt: '__COPY_product.stock.low__', cls: 'bg-yellow-100 text-[#a16207]' },
    out:      { txt: '__COPY_product.stock.out__', cls: 'bg-red-100 text-[var(--danger)]' },
  }[stockStatus];

  return (
    <a
      href={href || `/product/${id}`}
      className="bg-white border border-[var(--gray-200)] rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,.09)] hover:border-[var(--primary)]"
    >
      {/* Cover — emoji fallback when no image */}
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
        <div className="text-[13px] font-semibold leading-snug line-clamp-2">{name || '__COPY_product.name__'}</div>
        <div className="text-[var(--danger)] text-[17px] font-bold mt-1.5">
          {currency} {Number(price || 0).toFixed(2)}
        </div>
        <div className="text-[11px] text-[var(--gray-500)] mt-0.5 truncate">{subtitle || '__COPY_product.subtitle__'}</div>
        {stockBadge && (
          <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${stockBadge.cls}`}>
            {stockBadge.txt}
          </span>
        )}
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