// ProductModal.jsx
// 商品详情弹窗 — 原站 modal 结构(纯展示,不含任何业务/支付/分销逻辑)
// props: product = { id, name, price, subtitle?, coverEmoji?, cover?, stockStatus?, description? }; open; onClose; onAddToCart
// 红线: 不含 USDT/分销/邀请码任何痕迹。无「支付」「提现」「佣金」字段。

export default function ProductModal({ product, open, onClose, onAddToCart }) {
  if (!open || !product) return null;
  const { name, price, subtitle, coverEmoji, cover, description, stockStatus = 'in_stock', currency = 'USD' } = product;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pm-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
           onClick={(e) => e.stopPropagation()}>
        {/* Cover */}
        <div className="relative h-[280px] rounded-t-2xl overflow-hidden"
             style={{
               backgroundImage: cover ? `url(${cover})` : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
               backgroundSize: 'cover',
               backgroundPosition: 'center',
             }}>
          {!cover && (
            <div className="absolute inset-0 flex items-center justify-center text-[120px]">
              {coverEmoji || '__COPY_product.coverFallback__'}
            </div>
          )}
          <button onClick={onClose} aria-label={'__COPY_modal.close__'}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[18px]">
            ×
          </button>
        </div>

        <div className="p-6">
          <h2 id="pm-title" className="text-[21px] font-bold text-[var(--gray-900)]">
            {name || '__COPY_product.name__'}
          </h2>
          {subtitle && <p className="text-[13px] text-[var(--gray-500)] mt-1">{subtitle}</p>}
          <div className="mt-3 text-[var(--danger)] text-[24px] font-bold">
            {currency} {Number(price || 0).toFixed(2)}
          </div>

          {description && (
            <div className="mt-4 text-[14px] text-[var(--gray-700)] leading-relaxed whitespace-pre-wrap">
              {description}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => onAddToCart?.(product)}
              disabled={stockStatus === 'out'}
              className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary-d)] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {'__COPY_product.addToCart__'}
            </button>
            <button onClick={onClose}
                    className="px-5 py-3 bg-[var(--gray-100)] hover:bg-[var(--gray-200)] text-[var(--gray-700)] rounded-lg font-semibold transition-colors">
              {'__COPY_modal.close__'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}