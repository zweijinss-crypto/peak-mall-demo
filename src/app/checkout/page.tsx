'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
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
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const all = loadAddrs();
    setAddresses(all);
    const def = all.find((a) => a.isDefault);
    setPickedAddrId(def?.id ?? all[0]?.id ?? null);
  }, []);

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 5;
  const total = subtotal + shipping;

  // Empty cart → bounce to /cart
  useEffect(() => {
    if (mounted && cart.length === 0) {
      router.replace('/cart');
    }
  }, [mounted, cart.length, router]);

  const onPlace = () => {
    setErrMsg(null);
    if (!pickedAddrId) {
      setErrMsg(t.checkout.placeOrderNeedAddress);
      return;
    }
    setBusy(true);
    // tiny delay so the success toast reads, then go to /orders
    placeOrder();
    setTimeout(() => router.push('/orders'), 1500);
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
          {/* SSR placeholder — height matches the typical 2-col checkout layout
              so the footer below doesn't shift down once the client renders
              the real sections. */}
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
        <header className="mb-6">
          <h1 className="text-[28px] font-extrabold text-ink-900 leading-tight">{t.checkout.title}</h1>
          <p className="text-[13.5px] text-ink-500 mt-1.5">{t.checkout.subtitle}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: address + payment + items */}
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
                          className={`w-full text-left p-3.5 rounded-lg border-2 transition-colors ${
                            picked
                              ? 'border-orange-700 bg-orange-50/40'
                              : 'border-ink-100 hover:border-ink-200 bg-white'
                          }`}
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
                  <li>
                    <button
                      onClick={() => router.push('/address')}
                      className="w-full text-[12.5px] text-orange-700 hover:text-orange-800 font-semibold py-2"
                    >
                      + {t.address.addNew}
                    </button>
                  </li>
                </ul>
              )}
            </section>

            {/* Payment method */}
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

            {/* Items recap */}
            <section className="bg-white rounded-xl p-5 border border-ink-100">
              <h2 className="text-[15px] font-bold text-ink-900 mb-3">
                {t.cart.title} · {t.checkout.itemCount(itemCount)}
              </h2>
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li key={item.id} className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded-md bg-ink-100 overflow-hidden flex-shrink-0">
                      {item.cover?.startsWith('/') || item.cover?.startsWith('http') ? (
                        <img
                          src={item.cover}
                          alt={item.name}
                          width="56"
                          height="56"
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

          {/* Right: summary */}
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

            {errMsg && (
              <div role="alert" className="mb-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
                {errMsg}
              </div>
            )}

            <button
              onClick={onPlace}
              disabled={busy || addresses.length === 0 || !pickedAddrId}
              className="w-full py-3.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[14px] font-extrabold tracking-wide rounded-md transition-colors"
            >
              {busy ? '…' : t.checkout.placeOrder}
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="w-full mt-2 py-2.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
            >
              ← {t.cart.continue}
            </button>
          </aside>
        </div>

        {/* Toast */}
        {busy && (
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