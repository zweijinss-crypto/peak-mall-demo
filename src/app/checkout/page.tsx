'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  PageBanner,
} from '@/components/peak-mall';
import { usePeakStore, type Order } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

const ADDR_KEY = 'peak_addresses';
/** E1: 记住上次选的地址 + 支付方式 */
const ADDR_PICK_KEY = 'peak_checkout_picked_addr';
const METHOD_KEY = 'peak_checkout_payment_method';

interface Address {
  id: string;
  name: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
}

function loadAddrs(): Address[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADDR_KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

type PaymentMethod = 'visa' | 'mastercard';

function detectBrand(num: string): 'visa' | 'mastercard' | null {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  return null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('cart');
  const cart = usePeakStore((s) => s.cart);
  const placeOrder = usePeakStore((s) => s.placeOrder);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pickedAddrId, setPickedAddrId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('visa');
  const [mounted, setMounted] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  /** 收银台 — 创建临时订单,等待支付确认 */
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  /** Card fields */
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  /** Suppress the cart-empty redirect for ~2s after pay completes —
   *  without this, paying clears the cart and the empty-cart guard
   *  redirects us back to /cart before /orders loads. */
  const justPaid = useRef(false);

  useEffect(() => {
    setMounted(true);
    const all = loadAddrs();
    setAddresses(all);
    // E1: 优先记住上次选的地址 → 默认地址 → 第一个
    const picked = typeof window !== 'undefined' ? localStorage.getItem(ADDR_PICK_KEY) : null;
    const exists = picked && all.find((a) => a.id === picked);
    if (exists) setPickedAddrId(picked);
    else {
      const def = all.find((a) => a.isDefault);
      setPickedAddrId(def?.id ?? all[0]?.id ?? null);
    }
    // E1: 还原上次选择的支付方式
    const savedMethod = typeof window !== 'undefined' ? localStorage.getItem(METHOD_KEY) : null;
    if (savedMethod === 'visa' || savedMethod === 'mastercard') {
      setMethod(savedMethod as PaymentMethod);
    }
  }, []);

  /** E1: 选择地址时写入 localStorage, 下次进来自动恢复 */
  const pickAddress = (id: string | null) => {
    setPickedAddrId(id);
    if (id && typeof window !== 'undefined') {
      localStorage.setItem(ADDR_PICK_KEY, id);
    }
  };

  /** E1: 选择支付方式时写入 localStorage */
  const pickMethod = (m: PaymentMethod) => {
    setMethod(m);
    if (typeof window !== 'undefined') {
      localStorage.setItem(METHOD_KEY, m);
    }
  };

  useEffect(() => {
    if (mounted && cart.length === 0 && !pendingOrder && !justPaid.current) {
      router.replace('/cart');
    }
  }, [mounted, cart.length, router, pendingOrder]);

  const subtotal = pendingOrder
    ? pendingOrder.total
    : cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const itemCount = pendingOrder
    ? pendingOrder.items.reduce((s, i) => s + i.qty, 0)
    : cart.reduce((sum, c) => sum + c.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 5;
  const total = subtotal + shipping;

  const cardValid =
    cardNum.replace(/\s/g, '').length >= 13 &&
    /^\d{2}\/\d{2}$/.test(cardExp) &&
    /^\d{3,4}$/.test(cardCvv) &&
    cardHolder.trim().length > 0;

  const detectedBrand = detectBrand(cardNum);
  const brandMismatch =
    cardNum.replace(/\s/g, '').length >= 4 && detectedBrand !== null && detectedBrand !== method;

  const enterCashier = () => {
    setErrMsg(null);
    if (!pickedAddrId) {
      setErrMsg(t.checkout.placeOrderNeedAddress);
      return;
    }
    const order = placeOrder();
    if (order) {
      setPendingOrder(order);
      setPayError(null);
    }
  };

  const cancelCashier = () => {
    setPendingOrder(null);
    setPayError(null);
    setCardNum('');
    setCardExp('');
    setCardCvv('');
    setCardHolder('');
  };

  const confirmPay = () => {
    if (!pendingOrder) return;
    setPayError(null);

    if (!cardValid) {
      setPayError(t.checkout.cardCvv + ' / ' + t.checkout.cardHolder);
      return;
    }
    if (brandMismatch) {
      setPayError(t.checkout.brandUnknown);
      return;
    }

    setPaying(true);
    // Simulate payment latency
    window.setTimeout(() => {
      setPaying(false);
      setPendingOrder(null);
      justPaid.current = true;
      router.push('/orders');
      window.setTimeout(() => { justPaid.current = false; }, 2000);
    }, 1500);
  };

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExp = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return digits.slice(0, 2) + '/' + digits.slice(2);
  };

  if (!mounted) {
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
          <div className="invisible" aria-hidden="true">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white rounded-xl p-5 border border-ink-100 h-48" />
                <div className="bg-white rounded-xl p-5 border border-ink-100 h-44" />
                <div className="bg-white rounded-xl p-5 border border-ink-100 h-72" />
              </div>
              <div className="bg-white rounded-xl p-5 border border-ink-100 h-72" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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
          title={pendingOrder ? t.checkout.cashier : t.checkout.title}
          subtitle={pendingOrder ? t.checkout.cashierSubtitle : t.checkout.subtitle}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Address */}
            <section className="bg-white rounded-xl p-5 border border-ink-100">
              <h2 className="text-[15px] font-bold text-ink-900 mb-3">
                {t.checkout.sectionAddress}
              </h2>
              {addresses.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-ink-200 rounded-lg">
                  <div className="text-[40px] mb-2">📍</div>
                  <div className="text-[14px] font-bold text-ink-900 mb-1">
                    {t.checkout.noAddress}
                  </div>
                  <div className="text-[12.5px] text-ink-500 mb-4">
                    {t.checkout.noAddressDesc}
                  </div>
                  <button
                    onClick={() => router.push('/address')}
                    className="px-5 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md transition-colors"
                  >
                    {t.checkout.goAddresses}
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {addresses.map((a) => {
                    const picked = a.id === pickedAddrId;
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => pickAddress(a.id)}
                          aria-pressed={picked}
                          disabled={!!pendingOrder}
                          className={`w-full text-left p-3.5 rounded-lg border-2 transition-colors ${
                            picked
                              ? 'border-orange-700 bg-orange-50/40'
                              : 'border-ink-100 hover:border-ink-200 bg-white'
                          } ${pendingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                picked ? 'border-orange-700 bg-orange-700' : 'border-ink-300'
                              }`}
                              aria-hidden="true"
                            >
                              {picked && (
                                <span className="block w-full h-full rounded-full bg-white scale-[0.4]" />
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[14px] font-bold text-ink-900">{a.name}</span>
                                <span className="text-[12.5px] text-ink-600">{a.phone}</span>
                                {a.isDefault && (
                                  <span className="text-[10.5px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-bold">
                                    {t.address.default}
                                  </span>
                                )}
                              </div>
                              <div className="text-[12.5px] text-ink-600 leading-snug">
                                {a.region} {a.detail}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {!pendingOrder && (
                    <li>
                      <button
                        onClick={() => router.push('/address')}
                        className="w-full text-[12.5px] text-orange-700 hover:text-orange-800 font-semibold py-2"
                      >
                        + {t.address.addNew}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Payment method */}
            {!pendingOrder && (
              <section className="bg-white rounded-xl p-5 border border-ink-100">
                <h2 className="text-[15px] font-bold text-ink-900 mb-3">
                  {t.checkout.sectionPayment}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: 'visa', label: t.checkout.methodVisa, desc: t.checkout.methodVisaDesc, icon: '💳', brand: 'VISA' },
                      { key: 'mastercard', label: t.checkout.methodMastercard, desc: t.checkout.methodMastercardDesc, icon: '💳', brand: 'MC' },
                    ] as Array<{ key: PaymentMethod; label: string; desc: string; icon: string; brand: string }>
                  ).map((m) => {
                    const picked = method === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => pickMethod(m.key)}
                        aria-pressed={picked}
                        className={`text-left p-3.5 rounded-lg border-2 transition-colors ${
                          picked
                            ? 'border-orange-700 bg-orange-50/40'
                            : 'border-ink-100 hover:border-ink-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[20px]" aria-hidden="true">{m.icon}</span>
                          <span className="text-[13.5px] font-bold text-ink-900">{m.label}</span>
                        </div>
                        <div className="text-[11.5px] text-ink-500 leading-snug">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Cashier surfaces — show only after order is created */}
            {pendingOrder && (
              <section className="bg-white rounded-xl p-5 border border-ink-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-ink-900">{t.checkout.payBy}</h2>
                  <button
                    onClick={cancelCashier}
                    className="text-[12.5px] text-ink-500 hover:text-ink-900 font-semibold"
                  >
                    ← {t.cart.continue}
                  </button>
                </div>

                {/* Method switcher (small chips) */}
                <div className="flex gap-2 mb-5">
                  {(
                    [
                      { key: 'visa' as PaymentMethod, label: t.checkout.methodVisa, icon: '💳', brand: 'VISA' },
                      { key: 'mastercard' as PaymentMethod, label: t.checkout.methodMastercard, icon: '💳', brand: 'MC' },
                    ]
                  ).map((m) => {
                    const picked = method === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => { pickMethod(m.key); setPayError(null); }}
                        aria-pressed={picked}
                        className={`px-3 py-2 text-[12.5px] font-bold rounded-md border transition-colors flex items-center gap-1.5 ${
                          picked
                            ? 'border-orange-700 bg-orange-50 text-orange-700'
                            : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-white'
                        }`}
                      >
                        <span aria-hidden="true">{m.icon}</span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* Card form */}
                <div className="space-y-4 max-w-[520px]">
                    <label className="block">
                      <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">{t.checkout.cardNumber}</span>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={cardNum}
                          onChange={(e) => setCardNum(formatCardNumber(e.target.value))}
                          placeholder={t.checkout.cardNumberPh}
                          className={`w-full px-3 py-2.5 pr-16 border rounded-md text-[14px] font-mono tracking-wide outline-none focus:ring-2 ${
                            brandMismatch
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                              : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'
                          }`}
                          aria-label={t.checkout.cardNumber}
                        />
                        {cardNum.replace(/\s/g, '').length >= 4 && (
                          <span
                            className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] font-extrabold tracking-wider px-1.5 py-0.5 rounded ${
                              brandMismatch
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                            aria-live="polite"
                          >
                            {detectedBrand
                              ? t.checkout.brandDetected(method === 'visa' ? 'Visa' : 'Mastercard')
                              : t.checkout.brandUnknown}
                          </span>
                        )}
                      </div>
                      {brandMismatch && (
                        <span className="block mt-1.5 text-[11.5px] text-rose-600">
                          {t.checkout.brandUnknown}
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">{t.checkout.cardExp}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={cardExp}
                          onChange={(e) => setCardExp(formatExp(e.target.value))}
                          placeholder={t.checkout.cardExpPh}
                          className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          aria-label={t.checkout.cardExp}
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">{t.checkout.cardCvv}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder={t.checkout.cardCvvPh}
                          className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          aria-label={t.checkout.cardCvv}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">{t.checkout.cardHolder}</span>
                      <input
                        type="text"
                        autoComplete="cc-name"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder={t.checkout.cardHolderPh}
                        className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        aria-label={t.checkout.cardHolder}
                      />
                    </label>
                    <p className="text-[11.5px] text-ink-500 flex items-center gap-1.5">
                      <span aria-hidden="true">🔒</span>
                      {t.checkout.cardEncrypted}
                    </p>
                  </div>
              </section>
            )}

            {/* Items recap */}
            <section className="bg-white rounded-xl p-5 border border-ink-100">
              <h2 className="text-[15px] font-bold text-ink-900 mb-3">
                {t.cart.title} · {t.checkout.itemCount(itemCount)}
              </h2>
              <ul className="space-y-3">
                {(pendingOrder ? pendingOrder.items.map((it) => ({
                  id: it.productId,
                  name: it.name,
                  price: it.price,
                  qty: it.qty,
                  cover: it.cover,
                })) : cart).map((item) => (
                  <li key={item.id} className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded-md bg-ink-100 overflow-hidden flex-shrink-0">
                      {item.cover?.startsWith('/') || item.cover?.startsWith('http') ? (
                        <Image
                          src={item.cover}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[20px]">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink-900 line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-[11.5px] text-ink-500">× {item.qty}</div>
                    </div>
                    <div className="text-[13.5px] font-bold text-orange-700">
                      ${(item.price * item.qty).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="bg-white rounded-xl p-5 border border-ink-100 h-fit lg:sticky lg:top-24">
            <h2 className="text-[16px] font-bold text-ink-900 mb-4">
              {t.checkout.sectionSummary}
            </h2>
            <div className="space-y-2.5 text-[13.5px] mb-4">
              <div className="flex justify-between text-ink-600">
                <span>{t.checkout.subtotal}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>{t.checkout.shipping}</span>
                <span className={shipping === 0 ? 'text-emerald-700 font-semibold' : ''}>
                  {shipping === 0 ? t.checkout.freeShipping : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-ink-100 pt-2.5 flex justify-between text-[16px] font-extrabold text-ink-900">
                <span>{t.checkout.total}</span>
                <span className="text-orange-700">${total.toFixed(2)}</span>
              </div>
            </div>

            {(errMsg || payError) && (
              <div role="alert" className="mb-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
                {errMsg ?? payError}
              </div>
            )}

            {!pendingOrder ? (
              <>
                <button
                  onClick={enterCashier}
                  disabled={addresses.length === 0 || !pickedAddrId}
                  className="w-full py-3.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[14px] font-extrabold tracking-wide rounded-md transition-colors"
                >
                  {t.checkout.placeOrder}
                </button>
                <button
                  onClick={() => router.push('/cart')}
                  className="w-full mt-2 py-2.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
                >
                  ← {t.cart.continue}
                </button>
              </>
            ) : (
              <button
                onClick={confirmPay}
                disabled={
                  paying ||
                  !cardValid ||
                  brandMismatch
                }
                className="w-full py-3.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[14px] font-extrabold tracking-wide rounded-md transition-colors"
              >
                {paying ? t.checkout.payProcessing : `${t.checkout.confirmPay} $${total.toFixed(2)}`}
              </button>
            )}
          </aside>
        </div>

        {/* Toast on pay success */}
        {paying && (
          <div
            role="status"
            className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-float text-[14px] font-semibold animate-fade-up"
          >
            ✓ {t.checkout.orderSuccess}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
