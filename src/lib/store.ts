import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  cover?: string;
  qty: number;
  /** 是否计入结算 — 默认 true,用户可在购物车手动勾选/取消 */
  selected?: boolean;
}

/**
 * Coupon — 演示用,3 张优惠码固定:
 *   SAVE10  → 9 折
 *   FREESHIP → 免运费
 *   VIP20    → 立减 $20(满 $200)
 * 写在 cart 里,不持久化到用户订单(下单后清掉)
 */
export type CouponCode = 'SAVE10' | 'FREESHIP' | 'VIP20';

export interface CartCoupon {
  code: CouponCode;
  /** 应用时间,用于在 cart UI 显示「应用了多久」 */
  appliedAt: number;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  cover?: string;
}

/**
 * PaymentRecord — 演示用,字段只到 BIN + last4,绝不写真实卡号。
 * 真实生产:支付网关 tokenize,前端只持有 brand + last4 + expMonth/expYear。
 */
export interface PaymentRecord {
  /** 支付方式 */
  method: 'card' | 'wallet' | 'bank';
  /** 卡品牌 (公开 test BIN 池,见 pay-fixtures.ts) */
  brand: 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'JCB' | 'Diners' | 'UnionPay';
  /** BIN 前 6 位 — 仅来自公开 test BIN 表,绝不写真卡 BIN */
  bin: string;
  /** 末四位 — demo 用随机数,绝不写真卡 */
  last4: string;
  /** 金额(分) — 演示用,跟 Order.total 对齐 */
  amount: number;
  /** 货币 */
  currency: 'USD' | 'CNY' | 'EUR';
  /** 支付状态 */
  status: 'success' | 'failed' | 'pending' | 'refunded';
  /** 授权码 — demo 用占位 */
  authCode?: string;
  /** 错误码 — 仅失败时有 */
  errorCode?: 'INSUFFICIENT_FUNDS' | 'CARD_DECLINED' | 'EXPIRED' | 'CVV_MISMATCH' | 'NETWORK';
  /** 支付完成时间 */
  paidAt?: number;
}

export interface Order {
  id: string;
  createdAt: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  /** 支付明细(可选,放空就当作未支付) */
  payment?: PaymentRecord;
}

export interface WishItem {
  id: number;
  addedAt: number;
}

export type Locale = 'zh' | 'en';
export type CurrencyCode = 'USD' | 'CNY' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'AUD' | 'CAD';

interface PeakStore {
  cart: CartItem[];
  orders: Order[];
  wishlist: WishItem[];
  locale: Locale;
  currency: CurrencyCode;
  /** 当前生效的优惠券(只对 cart 页面生效,下单后清掉) */
  coupon: CartCoupon | null;
  addToCart: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  updateQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  /** 勾选 / 取消勾选单个商品 */
  toggleSelect: (id: number) => void;
  /** 全选 / 取消全选 */
  setAllSelected: (selected: boolean) => void;
  /** 应用优惠券 */
  applyCoupon: (code: CouponCode) => boolean;
  /** 移除优惠券 */
  removeCoupon: () => void;
  toggleWish: (id: number) => void;
  placeOrder: () => Order | null;
  setLocale: (l: Locale) => void;
  setCurrency: (c: CurrencyCode) => void;
}

export const usePeakStore = create<PeakStore>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      wishlist: [],
      locale: 'zh',
      currency: 'USD',
      coupon: null,

      addToCart: (item, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((c) => c.id === item.id);
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.id === item.id ? { ...c, qty: c.qty + qty, selected: true } : c
              ),
            };
          }
          return { cart: [...s.cart, { ...item, qty, selected: true }] };
        }),

      updateQty: (id, qty) =>
        set((s) => ({
          cart: s.cart
            .map((c) => (c.id === id ? { ...c, qty } : c))
            .filter((c) => c.qty > 0),
        })),

      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

      clearCart: () => set({ cart: [], coupon: null }),

      toggleSelect: (id) =>
        set((s) => ({
          cart: s.cart.map((c) =>
            c.id === id ? { ...c, selected: c.selected === false ? true : false } : c
          ),
        })),

      setAllSelected: (selected) =>
        set((s) => ({
          cart: s.cart.map((c) => ({ ...c, selected })),
        })),

      applyCoupon: (code) => {
        const valid: CouponCode[] = ['SAVE10', 'FREESHIP', 'VIP20'];
        if (!valid.includes(code)) return false;
        set({ coupon: { code, appliedAt: Date.now() } });
        return true;
      },

      removeCoupon: () => set({ coupon: null }),

      toggleWish: (id) =>
        set((s) => {
          const exists = s.wishlist.some((w) => w.id === id);
          return {
            wishlist: exists
              ? s.wishlist.filter((w) => w.id !== id)
              : [...s.wishlist, { id, addedAt: Date.now() }],
          };
        }),

      placeOrder: () => {
        const s = get();
        if (s.cart.length === 0) return null;
        const order: Order = {
          id: 'O' + Date.now().toString(36).toUpperCase(),
          createdAt: Date.now(),
          items: s.cart.map((c) => ({
            productId: c.id,
            name: c.name,
            price: c.price,
            qty: c.qty,
            cover: c.cover,
          })),
          total: s.cart.reduce((sum, c) => sum + c.price * c.qty, 0),
          status: 'pending',
        };
        set({ orders: [order, ...s.orders], cart: [], coupon: null });
        return order;
      },

      setLocale: (locale) => set({ locale }),
      setCurrency: (currency: CurrencyCode) => set({ currency }),
    }),
    {
      name: 'peak-mall-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cart: s.cart,
        orders: s.orders,
        wishlist: s.wishlist,
        locale: s.locale,
        currency: s.currency,
        coupon: s.coupon,
      }),
    }
  )
);
