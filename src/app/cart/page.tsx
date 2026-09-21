'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  PageBanner,
} from '@/components/peak-mall';
import { usePeakStore, type CouponCode, type CartItem } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

/**
 * 购物车 - 单品勾选 + 优惠券 (A1 + A2)
 *
 * 选中态(cartItem.selected)只控制结算汇总,不影响 wishlist / detail
 * 优惠码只对 cart 页面有效,placeOrder 时清掉
 */
export default function CartPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('cart');
  const cart = usePeakStore((s) => s.cart);
  const coupon = usePeakStore((s) => s.coupon);
  const lastCouponCode = usePeakStore((s) => s.lastCouponCode);
  const updateQty = usePeakStore((s) => s.updateQty);
  const remove = usePeakStore((s) => s.removeFromCart);
  const clear = usePeakStore((s) => s.clearCart);
  const toggleSelect = usePeakStore((s) => s.toggleSelect);
  const setAllSelected = usePeakStore((s) => s.setAllSelected);
  const applyCoupon = usePeakStore((s) => s.applyCoupon);
  const removeCoupon = usePeakStore((s) => s.removeCoupon);

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  /** 只算 selected=true 的商品 */
  const selectedItems = useMemo<CartItem[]>(
    () => cart.filter((c) => c.selected !== false),
    [cart]
  );

  const subtotal = selectedItems.reduce((sum, c) => sum + c.price * c.qty, 0);
  const itemCount = selectedItems.reduce((sum, c) => sum + c.qty, 0);
  const allSelected = cart.length > 0 && selectedItems.length === cart.length;

  /** 优惠券计算 */
  const discount = useMemo(() => {
    if (!coupon || subtotal <= 0) return 0;
    if (coupon.code === 'SAVE10') return Math.round(subtotal * 0.1 * 100) / 100;
    if (coupon.code === 'VIP20') {
      if (subtotal < 200) return 0;
      return 20;
    }
    return 0;
  }, [coupon, subtotal]);

  const shippingFree = coupon?.code === 'FREESHIP' || subtotal >= 50;
  const shipping = shippingFree ? 0 : 5;
  const grandTotal = Math.max(0, subtotal - discount + shipping);

  const handleApplyCoupon = (overrideCode?: string) => {
    const code = (overrideCode ?? couponInput).trim().toUpperCase();
    if (!code) {
      setCouponMsg({ kind: 'error', text: t.cart.couponInvalid });
      return;
    }
    const valid: CouponCode[] = ['SAVE10', 'FREESHIP', 'VIP20'];
    if (!valid.includes(code as CouponCode)) {
      setCouponMsg({ kind: 'error', text: t.cart.couponInvalid });
      return;
    }
    // VIP20 min $200 校验 - 即使已有选中但不够,提示一下
    if (code === 'VIP20' && subtotal < 200 && subtotal > 0) {
      setCouponMsg({ kind: 'error', text: t.cart.couponInvalidMin });
      return;
    }
    const ok = applyCoupon(code as CouponCode);
    if (ok) {
      setCouponMsg({ kind: 'ok', text: t.cart.couponApplied(code) });
      setCouponInput('');
    } else {
      setCouponMsg({ kind: 'error', text: t.cart.couponInvalid });
    }
  };

  const onCheckout = () => {
    if (selectedItems.length === 0) return;
    router.push('/checkout');
  };

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active={chrome.active}
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <PageBanner
          title={t.cart.title}
          subtitle={chrome.isEn ? 'Review your items before checkout' : '结算前查看并调整商品'}
          stats={[
            { label: chrome.isEn ? 'Items' : '件数', value: itemCount },
            { label: chrome.isEn ? 'Subtotal' : '小计', value: `$${subtotal.toFixed(2)}`, tone: 'accent' as const },
            { label: chrome.isEn ? 'Selected' : '已选', value: `${selectedItems.length}/${cart.length}` },
          ]}
        />

        {cart.length === 0 ? (
          <div className="bg-white rounded-xl py-14 text-center border border-ink-100">
            <div className="text-[40px] mb-3">🛒</div>
            <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.cart.empty}</div>
            <div className="text-[12px] text-ink-500 mb-5">{t.cart.emptyDesc}</div>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors"
            >
              {t.cart.continue}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              {/* Select all bar */}
              <div className="bg-white rounded-xl border border-ink-100 px-4 py-3 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold text-ink-900">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => setAllSelected(e.target.checked)}
                    className="w-4 h-4 accent-orange-700 cursor-pointer"
                    aria-label={t.cart.selectAll}
                  />
                  {t.cart.selectAll}
                </label>
                <span className="text-[12px] text-ink-500">
                  {t.cart.selectedCount(selectedItems.length, cart.length)}
                </span>
                <button
                  onClick={() => clear()}
                  className="ml-auto text-[13px] text-ink-500 hover:text-rose-700 transition-colors"
                >
                  {t.cart.clear}
                </button>
              </div>

              {cart.map((item) => {
                const checked = item.selected !== false;
                return (
                  <article
                    key={item.id}
                    className={`bg-white rounded-xl p-4 border flex gap-4 transition-colors ${
                      checked ? 'border-ink-100' : 'border-ink-100 bg-ink-50/60 opacity-70'
                    }`}
                  >
                    <label className="flex-shrink-0 flex items-center cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(item.id)}
                        className="w-5 h-5 accent-orange-700 cursor-pointer"
                        aria-label={item.name}
                      />
                    </label>
                    <button
                      onClick={() => router.push(`/shop/${item.id}`)}
                      className="flex-shrink-0 w-24 h-24 rounded-lg bg-ink-100 overflow-hidden"
                    >
                      {item.cover?.startsWith('/') || item.cover?.startsWith('http') ? (
                        <Image src={item.cover} alt={item.name} width={120} height={120} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[36px]">📦</div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <button
                          onClick={() => router.push(`/shop/${item.id}`)}
                          className="text-[14.5px] font-semibold text-ink-900 hover:text-orange-700 transition-colors line-clamp-2 text-left"
                        >
                          {item.name}
                        </button>
                        <button
                          onClick={() => remove(item.id)}
                          aria-label={t.cart.removed}
                          className="flex-shrink-0 w-7 h-7 rounded-md text-ink-600 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-orange-700 text-[18px] font-extrabold mb-3">${item.price.toFixed(2)}</div>
                      <div className="inline-flex items-center border border-ink-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          disabled={item.qty <= 1}
                          className="w-9 h-9 hover:bg-ink-50 text-[14px] disabled:opacity-40"
                          aria-label={t.cart.qtyDecLabel}
                        >−</button>
                        <span className="w-10 text-center text-[13.5px] font-semibold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-9 h-9 hover:bg-ink-50 text-[14px]"
                          aria-label={t.cart.qtyIncLabel}
                        >+</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Summary */}
            <aside className="bg-white rounded-xl p-5 border border-ink-100 h-fit lg:sticky lg:top-24 space-y-5">
              {/* Coupon */}
              <section>
                <h2 className="text-[12px] font-bold text-ink-900 uppercase tracking-wider mb-2">
                  {t.cart.couponTitle}
                </h2>
                {coupon ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-md">
                    <span className="flex-1 text-[13px] font-bold text-orange-800 font-mono">{coupon.code}</span>
                    <span className="text-[12px] text-orange-700">{t.cart.couponApplied(coupon.code)}</span>
                    <button
                      onClick={() => { removeCoupon(); setCouponMsg(null); }}
                      className="text-[12px] text-ink-500 hover:text-rose-700 font-semibold"
                    >
                      {t.cart.couponRemove}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* G1: 上次用过 X [再次使用] — placeOrder 后保留,一键复用 */}
                    {lastCouponCode && lastCouponCode !== couponInput.trim().toUpperCase() && (
                      <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-[12.5px]">
                        <span className="text-amber-800">
                          🔖 {t.cart.lastCoupon(lastCouponCode)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon(lastCouponCode)}
                          className="ml-auto px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[11.5px] font-bold rounded transition-colors"
                        >
                          {t.cart.lastCouponReuse}
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value); setCouponMsg(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                        placeholder={t.cart.couponPlaceholder}
                        className="flex-1 px-3 py-2 border border-ink-200 rounded-md text-[13px] font-mono uppercase outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        aria-label={t.cart.couponPlaceholder}
                      />
                      <button
                        onClick={() => handleApplyCoupon()}
                        className="px-4 py-2 bg-ink-900 hover:bg-ink-700 text-white text-[13px] font-bold rounded-md transition-colors"
                      >
                        {t.cart.couponApply}
                      </button>
                    </div>
                    <p className="mt-2 text-[11.5px] text-ink-500 leading-relaxed">{t.cart.couponHints}</p>
                  </>
                )}
                {couponMsg && (
                  <div
                    role="status"
                    className={`mt-2 px-3 py-2 rounded-md text-[12px] border ${
                      couponMsg.kind === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {couponMsg.kind === 'ok' ? '✓ ' : '⚠ '}{couponMsg.text}
                  </div>
                )}
              </section>

              <hr className="border-ink-100" />

              {/* Totals */}
              <section>
                <h2 className="text-[16px] font-bold text-ink-900 mb-4">{t.cart.subtotal}</h2>
                <div className="space-y-2.5 text-[13.5px] mb-4">
                  <div className="flex justify-between text-ink-600">
                    <span>{t.orders.itemCount(itemCount)}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-orange-700 font-semibold">
                      <span>{t.cart.discountLabel}</span>
                      <span>−${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-ink-600">
                    <span>{t.cart.shippingLabel}</span>
                    <span className={shippingFree ? 'text-emerald-700 font-semibold' : ''}>
                      {shippingFree ? t.cart.freeShippingNote : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="border-t border-ink-100 pt-2.5 flex justify-between text-[16px] font-extrabold text-ink-900">
                    <span>{t.cart.total}</span>
                    <span className="text-orange-700">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                {selectedItems.length === 0 ? (
                  <>
                    <button
                      disabled
                      className="w-full py-3.5 bg-ink-300 text-white text-[14px] font-extrabold tracking-wide rounded-md cursor-not-allowed mb-2"
                    >
                      {t.cart.checkout}
                    </button>
                    <p className="text-[11.5px] text-ink-500 text-center mb-2">{t.cart.selectedEmpty}</p>
                  </>
                ) : (
                  <button
                    onClick={onCheckout}
                    className="w-full py-3.5 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-extrabold tracking-wide rounded-md transition-colors mb-2"
                  >
                    {t.cart.checkout}
                  </button>
                )}
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-2.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
                >
                  {t.cart.continue}
                </button>
              </section>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
