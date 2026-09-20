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

type PaymentMethod = 'card' | 'wallet' | 'bank';

const WALLET_BALANCE = 248.90;

const BANK_INFO = {
  account: '6225 7600 1234 5678',
  bankName: 'ICBC 中国工商银行',
  beneficiary: '深圳市顶峰商城有限公司',
};

export default function CheckoutPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('cart');
  const cart = usePeakStore((s) => s.cart);
  const placeOrder = usePeakStore((s) => s.placeOrder);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pickedAddrId, setPickedAddrId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [mounted, setMounted] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  /** 收银台 — 创建临时订单,等待支付确认 */
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [bankCopied, setBankCopied] = useState(false);

  /** Card fields */
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  /** Bank countdown */
  const [bankSecondsLeft, setBankSecondsLeft] = useState(15 * 60);

  /** Suppress the cart-empty redirect for ~2s after pay completes —
   *  without this, paying clears the cart and the empty-cart guard
   *  redirects us back to /cart before /orders loads. */
  const justPaid = useRef(false);

  useEffect(() => {
    setMounted(true);
    const all = loadAddrs();
    setAddresses(all);
    const def = all.find((a) => a.isDefault);
    setPickedAddrId(def?.id ?? all[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (mounted && cart.length === 0 && !pendingOrder && !justPaid.current) {
      router.replace('/cart');
    }
  }, [mounted, cart.length, router, pendingOrder]);

  useEffect(() => {
    if (pendingOrder && method === 'bank') {
      const t = setInterval(() => {
        setBankSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
      return () => clearInterval(t);
    }
  }, [pendingOrder, method]);

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
    setBankSecondsLeft(15 * 60);
    setBankCopied(false);
  };

  const confirmPay = () => {
    if (!pendingOrder) return;
    setPayError(null);

    if (method === 'card') {
      if (!cardValid) {
        setPayError(t.checkout.cardCvv + ' / ' + t.checkout.cardHolder);
        return;
      }
    } else if (method === 'wallet') {
      if (WALLET_BALANCE < total) {
        setPayError(t.checkout.walletInsufficient);
        return;
      }
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

  const copyBankAccount = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(BANK_INFO.account).catch(() => {});
      setBankCopied(true);
      window.setTimeout(() => setBankCopied(false), 1500);
    }
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

  const mm = Math.floor(bankSecondsLeft / 60).toString().padStart(2, '0');
  const ss = (bankSecondsLeft % 60).toString().padStart(2, '0');

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
                          onClick={() => setPickedAddrId(a.id)}
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
                      { key: 'card', label: t.checkout.methodCard, desc: t.checkout.methodCardDesc, icon: '💳' },
                      { key: 'wallet', label: t.checkout.methodWallet, desc: t.checkout.methodWalletDesc, icon: '👛' },
                      { key: 'bank', label: t.checkout.methodBank, desc: t.checkout.methodBankDesc, icon: '🏦' },
                    ] as Array<{ key: PaymentMethod; label: string; desc: string; icon: string }>
                  ).map((m) => {
                    const picked = method === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMethod(m.key)}
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
                      { key: 'card', label: t.checkout.methodCard, icon: '💳' },
                      { key: 'wallet', label: t.checkout.methodWallet, icon: '👛' },
                      { key: 'bank', label: t.checkout.methodBank, icon: '🏦' },
                    ] as Array<{ key: PaymentMethod; label: string; icon: string }>
                  ).map((m) => {
                    const picked = method === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => { setMethod(m.key); setPayError(null); }}
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
                {method === 'card' && (
                  <div className="space-y-4 max-w-[520px]">
                    <label className="block">
                      <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">{t.checkout.cardNumber}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardNum}
                        onChange={(e) => setCardNum(formatCardNumber(e.target.value))}
                        placeholder={t.checkout.cardNumberPh}
                        className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] font-mono tracking-wide outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        aria-label={t.checkout.cardNumber}
                      />
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
                )}

                {/* Wallet summary */}
                {method === 'wallet' && (
                  <div className="max-w-[520px] space-y-4">
                    <div className={`p-4 rounded-lg border ${
                      WALLET_BALANCE >= total
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-0.5">
                            {t.checkout.walletBalance}
                          </div>
                          <div className="text-[24px] font-extrabold text-ink-900 tabular-nums">
                            ${WALLET_BALANCE.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => router.push('/funds')}
                          className="px-3 py-1.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[12px] font-bold rounded transition-colors"
                        >
                          + {t.checkout.walletTopup}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-[13px] text-ink-700">
                      <span>{t.checkout.total}</span>
                      <span className="font-bold tabular-nums">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-ink-500">
                        {chrome.isEn ? 'After payment' : '支付后余额'}
                      </span>
                      <span className={`font-bold tabular-nums ${WALLET_BALANCE >= total ? 'text-emerald-700' : 'text-rose-700'}`}>
                        ${(WALLET_BALANCE - total).toFixed(2)}
                      </span>
                    </div>
                    {WALLET_BALANCE < total && (
                      <div role="alert" className="px-3 py-2 rounded-md bg-rose-100 border border-rose-200 text-rose-700 text-[12.5px]">
                        {t.checkout.walletInsufficient}
                      </div>
                    )}
                  </div>
                )}

                {/* Bank transfer */}
                {method === 'bank' && (
                  <div className="max-w-[520px] space-y-4">
                    <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-md text-[12.5px] text-amber-800 flex items-center justify-between">
                      <span>⏱ {t.checkout.bankCountdown} · {t.checkout.bankExpiresIn} {mm}:{ss}</span>
                    </div>
                    <div className="bg-white border border-ink-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-ink-50 border-b border-ink-100 flex items-center justify-between">
                        <span className="text-[12px] font-bold text-ink-700">{t.checkout.bankAccount}</span>
                        <button
                          onClick={copyBankAccount}
                          className="text-[12px] font-bold text-orange-700 hover:text-orange-800"
                        >
                          {bankCopied ? `✓ ${t.checkout.bankCopied}` : t.checkout.bankCopy}
                        </button>
                      </div>
                      <dl className="px-4 py-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px]">
                        <dt className="text-ink-500">{BANK_INFO.bankName}</dt>
                        <dd className="font-mono font-bold text-ink-900">{BANK_INFO.account}</dd>
                        <dt className="text-ink-500">{chrome.isEn ? 'Beneficiary' : '收款人'}</dt>
                        <dd className="text-ink-900">{BANK_INFO.beneficiary}</dd>
                        <dt className="text-ink-500">{chrome.isEn ? 'Order ID' : '订单号'}</dt>
                        <dd className="font-mono font-bold text-orange-700">{pendingOrder.id}</dd>
                      </dl>
                    </div>
                    <p className="text-[12px] text-ink-500">{t.checkout.bankMemo}</p>
                  </div>
                )}
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
                  (method === 'card' && !cardValid) ||
                  (method === 'wallet' && WALLET_BALANCE < total)
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
