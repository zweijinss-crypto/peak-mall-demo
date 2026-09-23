'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  PageBanner,
} from '@/components/peak-mall';
import { usePeakStore, type Order } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import { checkRateLimit } from '@/lib/api/rate-limit';

/** 💳 pay-records 白名单卡 — 同步脚本生成 public/whitelist.json */
interface WhitelistCard {
  card_number: string;
  expiry: string;
  cvv: string;
  holder: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  phone: string;
  email: string;
  limit: number;
  /** Phase 4 #3 — 已用额度 (从 pay-records /api/cards sync 过来) */
  used: number;
}
import {
  createCheckoutSession,
  parseCheckoutReturn,
  isStripeBrowserConfigured,
  chargeOnPeak,
  redeemOnPeak,
} from '@/lib/api';

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

  /** 礼品码 (Phase 3) */
  const [giftCode, setGiftCode] = useState('');
  const [giftRedeemed, setGiftRedeemed] = useState<Array<{ amount_used: number; value_remaining: number; code: string }>>([]);
  const [giftBusy, setGiftBusy] = useState(false);
  /** 礼品码专属错误(不占 payError) — 输入下方 inline 显示 */
  const [giftError, setGiftError] = useState<string | null>(null);
  /** Phase 4 #5 — 已用过的礼品码历史(localStorage),提供一键快选 */
  const [giftHistory, setGiftHistory] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('peak_gift_history');
      if (raw) setGiftHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const pushGiftHistory = (code: string) => {
    setGiftHistory(prev => {
      const next = [code, ...prev.filter(c => c !== code)].slice(0, 10);  // 最多 10 个
      try { localStorage.setItem('peak_gift_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  /** Card fields */
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  // 💳 测试白名单 — 选一张自动填表(默认 "手动输入",不选不动)
  const [whitelist, setWhitelist] = useState<WhitelistCard[]>([]);
  const [whitelistSel, setWhitelistSel] = useState<string>('');  // ''=手动输入
  useEffect(() => {
    fetch('/whitelist.json').then(r => r.ok ? r.json() : null).then(d => {
      if (d && Array.isArray(d.cards)) setWhitelist(d.cards);
    }).catch(() => { /* ignore — 走手动输入 */ });
  }, []);
  // Phase 2.5 — terms consent required at checkout.
  const [termsAgreed, setTermsAgreed] = useState(false);

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
  // Phase 4 #2: 礼品码减免 — 多码累计
  const giftDiscount = giftRedeemed.reduce((s, g) => s + Math.min(g.amount_used, subtotal + shipping), 0);
  const total = Math.max(0, subtotal + shipping - giftDiscount);

  const cardValid =
    cardNum.replace(/\s/g, '').length >= 13 &&
    /^\d{2}\/\d{2}$/.test(cardExp) &&
    /^\d{3,4}$/.test(cardCvv) &&
    cardHolder.trim().length > 0;

  const detectedBrand = detectBrand(cardNum);
  const brandMismatch =
    cardNum.replace(/\s/g, '').length >= 4 && detectedBrand !== null && detectedBrand !== method;

  // Phase 3: 礼品码核销 — 调用 /api/redeem, 拿 amount_used 回填
  // Phase 4 #1: 输入到 4 位后自动 debounce 核销, onBlur 立即核销
  const giftErrorKey = (rawError: string | undefined): string => {
    const e = (rawError || '').toLowerCase();
    if (e.includes('unknown')) return 'gift_err_unknown';
    if (e.includes('expired')) return 'gift_err_expired';
    if (e.includes('exhausted')) return 'gift_err_exhausted';
    if (e.includes('length')) return 'gift_err_length';
    if (e.includes('amount')) return 'gift_err_amount';
    return 'gift_err_generic';
  };
  const giftErrorText = (key: string): string => {
    const isZh = !chrome.isEn;
    const map: Record<string, { zh: string; en: string }> = {
      gift_err_unknown:  { zh: '礼品码不存在',  en: 'Code not found' },
      gift_err_expired:  { zh: '礼品码已过期',  en: 'Code expired' },
      gift_err_exhausted:{ zh: '礼品码余额为 0',en: 'Code balance is 0' },
      gift_err_length:   { zh: '礼品码长度须 4–32 位', en: 'Code must be 4–32 chars' },
      gift_err_amount:   { zh: '订单金额无效', en: 'Invalid order amount' },
      gift_err_offline:  { zh: '礼品码服务不可达', en: 'Gift service unreachable' },
      gift_err_generic:  { zh: '礼品码无效', en: 'Code invalid' },
    };
    return (map[key] || map.gift_err_generic)[isZh ? 'zh' : 'en'];
  };
  const applyGiftCode = async (raw?: string) => {
    const code = (raw ?? giftCode).trim();
    if (!code) return;
    // Phase 4 #2: 不允许重复添加同一礼品码
    if (giftRedeemed.some(g => g.code === code.toUpperCase())) {
      setGiftError(chrome.isEn ? 'Code already applied' : '该礼品码已使用');
      return;
    }
    setGiftBusy(true);
    setGiftError(null);
    // 已使用礼品码不占订单总额,只按当前应付额减免
    const remainingOrderTotal = Math.max(0, subtotal + shipping - giftRedeemed.reduce((s, g) => s + g.amount_used, 0));
    const res = await redeemOnPeak(code, remainingOrderTotal);
    setGiftBusy(false);
    if (!res) {
      setGiftError(giftErrorText('gift_err_offline'));
      return;
    }
    if (res.outcome === 'fail') {
      setGiftError(giftErrorText(giftErrorKey(res.error)));
      return;
    }
    if (res.amount_used != null && res.value_remaining != null) {
      setGiftRedeemed(prev => [...prev, { amount_used: res.amount_used!, value_remaining: res.value_remaining!, code: res.code! }]);
      setGiftCode('');
      setGiftError(null);
      pushGiftHistory(res.code!);
    }
  };
  // Phase 4 #1: debounce auto-apply — 4 位后停 400ms 自动调用
  useEffect(() => {
    const code = giftCode.trim();
    if (code.length < 4) return;
    const t = setTimeout(() => { applyGiftCode(code); }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftCode]);

  const removeGiftCode = (code?: string) => {
    // Phase 4 #4: 二次确认 — 避免误删。native confirm,无依赖
    const target = code || (chrome.isEn ? 'all gift codes' : '全部礼品码');
    const ok = window.confirm(
      chrome.isEn
        ? `Remove ${target}? The balance already redeemed will not be refunded.`
        : `确认移除${target}?已核销的额度不会退回。`
    );
    if (!ok) return;
    if (!code) {
      setGiftRedeemed([]);
    } else {
      setGiftRedeemed(prev => prev.filter(g => g.code !== code));
    }
    setGiftCode('');
    setGiftError(null);
  };

  const enterCashier = () => {
    setErrMsg(null);
    if (!pickedAddrId) {
      setErrMsg(t.checkout.placeOrderNeedAddress);
      return;
    }
    // Phase 2.5 — terms consent gate. Reject before creating a
    // pending order so we don't accumulate abandoned carts.
    if (!termsAgreed) {
      setErrMsg(t.checkout.termsAgreeRequired);
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

  const confirmPay = async () => {
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

    // Phase 1.2: real path — call the serverless endpoint, then either
    // redirect to Stripe Checkout OR fall back to the demo "pending"
    // path when Stripe is not configured in this build.
    const checkoutItems = pendingOrder.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      unitPrice: Math.round(Number(it.price) * 100), // dollars → cents
      qty: it.qty,
      cover: it.cover ?? null,
    }));

    try {
      const picked = addresses.find((a) => a.id === pickedAddrId);
      // Phase 2.7 — preflight checkout rate limit (20 / 5min / IP)
      // so burst-clicking "place order" can't drain Stripe API quota.
      const rl = await checkRateLimit('checkout');
      if (!rl.allowed) {
        setPayError(
          chrome.isEn
            ? `Too many attempts. Please wait ${rl.retryAfter}s and try again.`
            : `提交次数过多,请 ${rl.retryAfter} 秒后再试。`,
        );
        setPaying(false);
        return;
      }

      // Phase 2 — 真打通 peak-mall → pay-records-crawler 看板
      // 用白名单卡号直接调 /api/charge,成功 → /orders?paid=1 (真记到 dashboard)
      // 失败 / 不可达 → 降级走 Stripe 路径
      const orderNo = pendingOrder.id || ('PM' + Date.now().toString(36).toUpperCase());
      const chargeResult = await chargeOnPeak({
        card_number: cardNum,
        expiry: cardExp,
        cvv: cardCvv,
        holder: cardHolder,
        amount: total,  // Phase 3: 已扣礼品码后的应付金额
        order_no: orderNo,
        source: 'peak-mall-checkout',
      });

      if (chargeResult?.outcome === 'success') {
        // 真支付成功 — 跳 /orders?paid=1 + 订单号
        setPendingOrder(null);
        justPaid.current = true;
        router.push(`/orders?paid=1&order=${encodeURIComponent(orderNo)}&via=peak-records&masked=${encodeURIComponent(chargeResult.card_masked)}&remaining=${chargeResult.remaining ?? ''}`);
        window.setTimeout(() => { justPaid.current = false; }, 4000);
        return;
      }
      if (chargeResult && chargeResult.outcome === 'fail') {
        // 白名单 miss 或额度不足 — 不降级,直接弹错
        setPayError(t.checkout.chargeFail(chargeResult.error || 'unknown'));
        setPaying(false);
        return;
      }
      // chargeResult === null → pay-records 不可达,降级 Stripe
      // eslint-disable-next-line no-console
      console.warn('[checkout] pay-records unreachable, falling back to Stripe');

      const session = await createCheckoutSession({
        items: checkoutItems,
        shipping: {
          name: picked?.name ?? '—',
          phone: picked?.phone ?? '—',
          region: picked?.region ?? '—',
          detail: picked?.detail ?? '—',
        },
        currency: chrome.currency,
        couponCode: null,
      });

      if (!session) {
        setPayError(
          chrome.isEn
            ? 'Payment session failed. Please retry.'
            : '创建支付会话失败,请重试',
        );
        setPaying(false);
        return;
      }

      if (isStripeBrowserConfigured()) {
        // Stripe.js v9 dropped redirectToCheckout — the cleanest path
        // is to navigate directly to the Session URL we just created.
        // Stripe's hosted page handles the rest.
        window.location.href = session.url;
        return; // navigation in progress
      }

      // Fallback path (no Stripe configured): go straight to /orders.
      // The order is in 'pending' state; webhook / Phase 1.5 will flip it.
      setPendingOrder(null);
      justPaid.current = true;
      router.push(`/orders?paid=pending&order=${session.orderId}`);
      window.setTimeout(() => { justPaid.current = false; }, 4000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[checkout] confirmPay failed:', err);
      setPayError(
        chrome.isEn ? 'Payment failed. Please retry.' : '支付失败,请重试',
      );
    } finally {
      setPaying(false);
    }
  };

  // Parse ?cancelled=1 on mount so the user can tell the back-from-stripe case.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ret = parseCheckoutReturn(window.location.href);
    if (ret.sessionId && !ret.paid) {
      // Came back from Stripe without the success param (e.g. user closed
      // the tab mid-flow). Show a soft toast.
      setPayError(
        chrome.isEn
          ? 'Payment cancelled — your cart is still here.'
          : '支付已取消 — 购物车仍保留。',
      );
    }
  }, [chrome.isEn]);

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
                    {/* 🎁 礼品码 (Phase 3) — pay-records /api/redeem */}
                    <label className="block">
                      <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">
                        🎁 {chrome.isEn ? 'Gift code' : '礼品码'}
                      </span>
                      {giftRedeemed.length > 0 && (
                        <ul className="mb-2 space-y-1.5">
                          {giftRedeemed.map(g => (
                            <li key={g.code} className="flex items-center justify-between p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px]">
                              <span>
                                ✅ <span className="font-bold">{g.code}</span>
                                {' · -$' + g.amount_used.toFixed(2)}
                                {' · ' + (chrome.isEn ? `remaining $${g.value_remaining}` : `余额 $${g.value_remaining}`)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeGiftCode(g.code)}
                                className="text-emerald-700 hover:text-emerald-900 font-bold ml-3"
                                aria-label={chrome.isEn ? `Remove ${g.code}` : `移除 ${g.code}`}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={giftCode}
                          onChange={(e) => { setGiftCode(e.target.value.toUpperCase()); setGiftError(null); }}
                          onBlur={() => giftCode.trim().length >= 4 && applyGiftCode()}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyGiftCode(); } }}
                          placeholder={chrome.isEn ? (giftRedeemed.length ? 'Add another code…' : 'Enter gift code (e.g. WELCOME10)') : (giftRedeemed.length ? '再加一张礼品码…' : '输入礼品码 (如 WELCOME10)')}
                          className={`flex-1 px-3 py-2.5 border rounded-md text-[14px] font-mono outline-none focus:ring-2 uppercase ${giftError ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-ink-200 focus:border-orange-500 focus:ring-orange-100'}`}
                          aria-label={chrome.isEn ? 'Gift code' : '礼品码'}
                          aria-invalid={giftError ? true : undefined}
                          disabled={giftBusy}
                        />
                        <button
                          type="button"
                          onClick={() => applyGiftCode()}
                          disabled={giftBusy || !giftCode.trim()}
                          className="px-4 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:bg-ink-300 text-white text-[13px] font-bold rounded-md transition-colors"
                        >
                          {giftBusy
                            ? (chrome.isEn ? '...' : '验证…')
                            : (chrome.isEn ? 'Apply' : '使用')}
                        </button>
                      </div>
                      {/* Phase 4 #1 — inline gift error (只占礼品码输入框下方) */}
                      {giftError && (
                        <span role="alert" className="block mt-1.5 text-[11.5px] text-rose-600">
                          {giftError}
                        </span>
                      )}
                      {/* Phase 4 #5 — 礼品码历史快选 (去除已 redeem 的) */}
                      {giftHistory.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-[11px] text-ink-500 self-center mr-1">
                            {chrome.isEn ? 'Recent:' : '最近用过:'}
                          </span>
                          {giftHistory
                            .filter(c => !giftRedeemed.some(g => g.code === c))
                            .map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { setGiftCode(c); applyGiftCode(c); }}
                                className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-ink-200 text-ink-600 hover:border-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors"
                                aria-label={chrome.isEn ? `Reuse ${c}` : `重用 ${c}`}
                              >
                                {c}
                              </button>
                            ))}
                        </div>
                      )}
                    </label>

                    {/* 💳 白名单卡 — 选一张自动填表 (sync-whitelist.mjs 从 pay-records 同步) */}
                    {whitelist.length > 0 && (
                      <label className="block">
                        <span className="block text-[12.5px] text-ink-700 mb-1.5 font-medium">
                          💳 {t.checkout.whitelistLabel}
                        </span>
                        <select
                          value={whitelistSel}
                          onChange={(e) => {
                            const v = e.target.value;
                            setWhitelistSel(v);
                            if (!v) return;  // 空选项 = 手动输入,不清
                            const c = whitelist.find(x => x.card_number === v);
                            if (!c) return;
                            setCardNum(formatCardNumber(c.card_number));
                            setCardExp(c.expiry || '');
                            setCardCvv(c.cvv || '');
                            setCardHolder(c.holder || '');
                          }}
                          className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                          aria-label={t.checkout.whitelistLabel}
                        >
                          <option value="">{t.checkout.whitelistManual}</option>
                          {whitelist.map((c) => {
                            const remaining = (c.limit || 0) - (c.used || 0);
                            const lowBalance = remaining < (subtotal + shipping);
                            return (
                              <option key={c.card_number} value={c.card_number}>
                                {c.holder || 'Unknown'} · •••• {c.card_number.slice(-4)} · {c.expiry}
                                {' · ' + (chrome.isEn ? `$${remaining.toFixed(0)} left` : `剩 $${remaining.toFixed(0)}`)}
                                {lowBalance ? (chrome.isEn ? ' ⚠️' : ' ⚠️余额不足') : ''}
                              </option>
                            );
                          })}
                        </select>
                        {/* Phase 4 #3 — 选卡后显示剩余额度提示 */}
                        {whitelistSel && (() => {
                          const c = whitelist.find(x => x.card_number === whitelistSel);
                          if (!c) return null;
                          const remaining = (c.limit || 0) - (c.used || 0);
                          const enough = remaining >= total;
                          return (
                            <span role="status" className={`block mt-1.5 text-[11.5px] ${enough ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {enough
                                ? (chrome.isEn ? `✓ $${remaining.toFixed(2)} remaining on ${c.holder}` : `✓ ${c.holder} 卡片剩余额度 $${remaining.toFixed(2)}`)
                                : (chrome.isEn ? `⚠ Only $${remaining.toFixed(2)} left, need $${total.toFixed(2)}` : `⚠ 余额 $${remaining.toFixed(2)} < 应付 $${total.toFixed(2)}`)}
                            </span>
                          );
                        })()}
                      </label>
                    )}
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
              {giftRedeemed.length > 0 && (
                <>
                  {giftRedeemed.map(g => (
                    <div key={g.code} className="flex justify-between text-emerald-700">
                      <span>🎁 {chrome.isEn ? `Gift (${g.code})` : `礼品码 (${g.code})`}</span>
                      <span className="font-semibold">-${g.amount_used.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-emerald-800 text-[12px] pt-0.5">
                    <span>{chrome.isEn ? 'Total gift discount' : '礼品码合计减免'}</span>
                    <span className="font-bold">-${giftDiscount.toFixed(2)}</span>
                  </div>
                </>
              )}
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
                {/* Phase 2.5 — Terms consent checkbox required to place order. */}
                <label htmlFor="checkout-terms" className="flex items-start gap-2.5 text-[12.5px] text-neutral-700 mb-3 cursor-pointer leading-relaxed min-h-[28px] py-1">
                  <input
                    id="checkout-terms"
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    aria-required="true"
                    aria-invalid={errMsg === t.checkout.termsAgreeRequired ? true : undefined}
                    className="w-5 h-5 mt-0.5 accent-orange-700 cursor-pointer shrink-0"
                  />
                  <span>
                    {t.checkout.termsAgree.replace('{terms}', '').trim()}
                    {' '}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">{t.checkout.termsLinkText}</Link>
                  </span>
                </label>
                <button
                  onClick={enterCashier}
                  disabled={addresses.length === 0 || !pickedAddrId || !termsAgreed}
                  aria-disabled={addresses.length === 0 || !pickedAddrId || !termsAgreed}
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
