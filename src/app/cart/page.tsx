'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { FC } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function CartPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('cart');
  const cart = usePeakStore((s) => s.cart);
  const updateQty = usePeakStore((s) => s.updateQty);
  const remove = usePeakStore((s) => s.removeFromCart);
  const clear = usePeakStore((s) => s.clearCart);

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const onCheckout = () => {
    if (cart.length === 0) return;
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
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{t.cart.title}</h1>

        {cart.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-ink-100">
            <div className="text-[64px] mb-4">🛒</div>
            <div className="text-[18px] font-bold text-ink-900 mb-2">{t.cart.empty}</div>
            <div className="text-[13.5px] text-ink-500 mb-6">{t.cart.emptyDesc}</div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-bold rounded-md transition-colors"
            >
              {t.cart.continue}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-ink-100 flex gap-4"
                >
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
              ))}

              <button
                onClick={() => clear()}
                className="text-[13px] text-ink-500 hover:text-rose-700 transition-colors"
              >
                {t.cart.clear}
              </button>
            </div>

            {/* Summary */}
            <aside className="bg-white rounded-xl p-5 border border-ink-100 h-fit lg:sticky lg:top-24">
              <h2 className="text-[16px] font-bold text-ink-900 mb-4">{t.cart.subtotal}</h2>
              <div className="space-y-2.5 text-[13.5px] mb-4">
                <div className="flex justify-between text-ink-600">
                  <span>{t.orders.itemCount(itemCount)}</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>{t.cart.shippingLabel}</span>
                  <span className="text-emerald-700 font-semibold">{total >= 50 ? t.cart.freeShippingNote : t.cart.shippingFee}</span>
                </div>
                <div className="border-t border-ink-100 pt-2.5 flex justify-between text-[16px] font-extrabold text-ink-900">
                  <span>{t.cart.total}</span>
                  <span className="text-orange-700">${(total + (total >= 50 ? 0 : 5)).toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={onCheckout}
                className="w-full py-3.5 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-extrabold tracking-wide rounded-md transition-colors mb-2"
              >
                {t.cart.checkout}
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-2.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
              >
                {t.cart.continue}
              </button>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
