import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  fetchMyCart,
  saveMyCart,
  fetchMyWishlist,
  toggleMyWish as toggleMyWishRemote,
  fetchMyOrders,
  createOrder as createOrderRemote,
  cancelOwnOrder as cancelOwnOrderRemote,
  isSupabaseConfigured,
} from './api';

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
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  /** 支付明细(可选,放空就当作未支付) */
  payment?: PaymentRecord;
  /** 取消时间(仅 cancelled) */
  cancelledAt?: number;
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
  /** G1: 最近用过的优惠码 — placeOrder 后保留,供下次一键复用 */
  lastCouponCode: CouponCode | null;
  toggleWish: (id: number) => void;
  placeOrder: () => Order | null;
  /** 取消订单(仅 pending 可取消) */
  cancelOrder: (id: string) => Promise<boolean>;
  /** 再买一次 — 把订单 items 加回购物车 */
  reorder: (id: string) => boolean;
  setLocale: (l: Locale) => void;
  setCurrency: (c: CurrencyCode) => void;

  // ============================================================
  // Phase 1.1: Supabase sync actions.
  // When Supabase is configured and the user is signed in, these
  // mirror local state to the server; otherwise they no-op and the
  // demo keeps its localStorage behaviour.
  // ============================================================
  /** Hydrate cart + orders + wishlist from Supabase once. Idempotent. */
  syncFromServer: () => Promise<void>;
  /** Whether we've already attempted the one-time server hydration. */
  syncedFromServer: boolean;
  /** Whether Supabase is configured (env vars present). */
  supabaseEnabled: boolean;
  /** Manually flag sync complete (used by login flow / on-demand). */
  markSynced: () => void;

  // Phase 1.1.6 — observability for sync calls
  /** Key of the action currently mirroring to server (UI spinner target). */
  syncingAction: string | null;
  /** Last sync error message (UI toast target). null when healthy. */
  lastSyncError: string | null;
  setSyncingAction: (k: string | null) => void;
  setSyncError: (msg: string | null) => void;
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
      lastCouponCode: null,
      syncedFromServer: false,
      supabaseEnabled: isSupabaseConfigured(),
      syncingAction: null,
      lastSyncError: null,

      setSyncingAction: (k) => set({ syncingAction: k }),
      setSyncError: (msg) => set({ lastSyncError: msg }),

      // --------------------------------------------------------
      // Supabase sync (Phase 1.1). When env vars are missing or
      // the user is not signed in, these silently no-op.
      // --------------------------------------------------------
      syncFromServer: async () => {
        if (!isSupabaseConfigured()) return;
        if (get().syncedFromServer) return;

        const [cart, orders, wishlist] = await Promise.all([
          fetchMyCart(),
          fetchMyOrders(),
          fetchMyWishlist(),
        ]);

        set((s) => ({
          ...(cart !== null && {
            cart: cart.map((c) => ({
              id: c.productId,
              name: '', // name filled by remote lookup (Phase 1.3)
              price: 0,
              qty: c.qty,
              cover: undefined,
              selected: c.selected ?? true,
            })),
          }),
          ...(wishlist !== null && {
            wishlist: wishlist.map((id) => ({ id, addedAt: Date.now() })),
          }),
          ...(orders !== null && {
            orders: orders.map(mapRemoteOrderToLocal),
          }),
          syncedFromServer: true,
        }));
      },

      markSynced: () => set({ syncedFromServer: true }),

      addToCart: async (item, qty = 1) => {
        // Snapshot for rollback.
        const before = get().cart;
        // Local optimistic update first.
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
        });
        // Then mirror to Supabase if configured.
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'addToCart' });
        try {
          const newCart = get().cart.map((c) => ({
            productId: c.id,
            qty: c.qty,
            selected: c.selected,
          }));
          const ok = await saveMyCart(newCart);
          if (!ok) {
            set({ cart: before, lastSyncError: 'addToCart' });
          }
        } catch (e) {
          set({ cart: before, lastSyncError: 'addToCart' });
          // eslint-disable-next-line no-console
          console.error('[store] addToCart sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      updateQty: async (id, qty) => {
        const before = get().cart;
        set((s) => ({
          cart: s.cart
            .map((c) => (c.id === id ? { ...c, qty } : c))
            .filter((c) => c.qty > 0),
        }));
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'updateQty' });
        try {
          const newCart = get().cart.map((c) => ({
            productId: c.id,
            qty: c.qty,
            selected: c.selected,
          }));
          const ok = await saveMyCart(newCart);
          if (!ok) set({ cart: before, lastSyncError: 'updateQty' });
        } catch (e) {
          set({ cart: before, lastSyncError: 'updateQty' });
          // eslint-disable-next-line no-console
          console.error('[store] updateQty sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      removeFromCart: async (id) => {
        const before = get().cart;
        set((s) => ({ cart: s.cart.filter((c) => c.id !== id) }));
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'removeFromCart' });
        try {
          const newCart = get().cart.map((c) => ({
            productId: c.id,
            qty: c.qty,
            selected: c.selected,
          }));
          const ok = await saveMyCart(newCart);
          if (!ok) set({ cart: before, lastSyncError: 'removeFromCart' });
        } catch (e) {
          set({ cart: before, lastSyncError: 'removeFromCart' });
          // eslint-disable-next-line no-console
          console.error('[store] removeFromCart sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      clearCart: async () => {
        const before = { cart: get().cart, coupon: get().coupon };
        set({ cart: [], coupon: null });
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'clearCart' });
        try {
          const ok = await saveMyCart([]);
          if (!ok) set({ ...before, lastSyncError: 'clearCart' });
        } catch (e) {
          set({ ...before, lastSyncError: 'clearCart' });
          // eslint-disable-next-line no-console
          console.error('[store] clearCart sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      toggleSelect: async (id) => {
        const before = get().cart;
        set((s) => ({
          cart: s.cart.map((c) =>
            c.id === id ? { ...c, selected: c.selected === false ? true : false } : c
          ),
        }));
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'toggleSelect' });
        try {
          const newCart = get().cart.map((c) => ({
            productId: c.id,
            qty: c.qty,
            selected: c.selected,
          }));
          const ok = await saveMyCart(newCart);
          if (!ok) set({ cart: before, lastSyncError: 'toggleSelect' });
        } catch (e) {
          set({ cart: before, lastSyncError: 'toggleSelect' });
          // eslint-disable-next-line no-console
          console.error('[store] toggleSelect sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      setAllSelected: async (selected) => {
        const before = get().cart;
        set((s) => ({
          cart: s.cart.map((c) => ({ ...c, selected })),
        }));
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'setAllSelected' });
        try {
          const newCart = get().cart.map((c) => ({
            productId: c.id,
            qty: c.qty,
            selected: c.selected,
          }));
          const ok = await saveMyCart(newCart);
          if (!ok) set({ cart: before, lastSyncError: 'setAllSelected' });
        } catch (e) {
          set({ cart: before, lastSyncError: 'setAllSelected' });
          // eslint-disable-next-line no-console
          console.error('[store] setAllSelected sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      applyCoupon: (code) => {
        const valid: CouponCode[] = ['SAVE10', 'FREESHIP', 'VIP20'];
        if (!valid.includes(code)) return false;
        set({ coupon: { code, appliedAt: Date.now() }, lastCouponCode: code });
        return true;
      },

      removeCoupon: () => set({ coupon: null }),

      toggleWish: async (id) => {
        const before = get().wishlist;
        // Local first.
        set((s) => {
          const exists = s.wishlist.some((w) => w.id === id);
          return {
            wishlist: exists
              ? s.wishlist.filter((w) => w.id !== id)
              : [...s.wishlist, { id, addedAt: Date.now() }],
          };
        });
        // Then mirror to Supabase.
        if (!isSupabaseConfigured()) return;
        set({ syncingAction: 'toggleWish' });
        try {
          const ok = await toggleMyWishRemote(id);
          if (!ok) {
            set({ wishlist: before, lastSyncError: 'toggleWish' });
          }
        } catch (e) {
          set({ wishlist: before, lastSyncError: 'toggleWish' });
          // eslint-disable-next-line no-console
          console.error('[store] toggleWish sync failed:', e);
        } finally {
          set({ syncingAction: null });
        }
      },

      cancelOrder: async (id) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order || order.status !== 'pending') return false;
        const before = get().orders;
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: 'cancelled' as const, cancelledAt: Date.now() } : o
          ),
        }));
        if (!isSupabaseConfigured()) return true;
        set({ syncingAction: 'cancelOrder' });
        try {
          const ok = await cancelOwnOrderRemote(id);
          if (!ok) {
            set({ orders: before, lastSyncError: 'cancelOrder' });
            return false;
          }
        } catch (e) {
          set({ orders: before, lastSyncError: 'cancelOrder' });
          // eslint-disable-next-line no-console
          console.error('[store] cancelOrder sync failed:', e);
          return false;
        } finally {
          set({ syncingAction: null });
        }
        return true;
      },

      reorder: (id) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return false;
        set((s) => {
          const existingIds = new Set(s.cart.map((c) => c.id));
          const additions = order.items
            .filter((it) => !existingIds.has(it.productId))
            .map((it) => ({
              id: it.productId,
              name: it.name,
              price: it.price,
              cover: it.cover,
              qty: it.qty,
              selected: true,
            }));
          const merged = s.cart.map((c) => {
            const same = order.items.find((it) => it.productId === c.id);
            return same ? { ...c, qty: c.qty + same.qty } : c;
          });
          return { cart: [...merged, ...additions] };
        });
        return true;
      },

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
          total: s.cart.reduce((sum, c) => sum + Number(c.price) * c.qty, 0),
          status: 'pending',
        };
        set({ orders: [order, ...s.orders], cart: [], coupon: null, lastCouponCode: s.coupon?.code ?? s.lastCouponCode });

        // Phase 1.1: mirror order to Supabase if configured.
        // Payment is still mocked here; Phase 1.2 wires Stripe.
        if (isSupabaseConfigured()) {
          set({ syncingAction: 'placeOrder' });
          void createOrderRemote({
            items: s.cart.map((c) => ({
              productId: c.id,
              qty: c.qty,
              unitPrice: Number(c.price),
              name: { zh: c.name, en: c.name },
              cover: c.cover ?? null,
            })),
            shipping: {
              name: '—',
              phone: '—',
              region: '—',
              detail: '—',
            },
            total: {
              subtotal: order.total,
              shipping: 0,
              tax: 0,
              discount: 0,
              total: order.total,
            },
            currency: s.currency,
            couponCode: s.coupon?.code ?? null,
          }).then((res) => {
            if (res) {
              // Replace local placeholder id with real remote order id
              set((cur) => ({
                orders: cur.orders.map((o) =>
                  o.id === order.id ? { ...o, id: res.orderId } : o,
                ),
              }));
            } else {
              set({ lastSyncError: 'placeOrder' });
            }
          }).catch((e) => {
            set({ lastSyncError: 'placeOrder' });
            // eslint-disable-next-line no-console
            console.error('[store] placeOrder sync failed:', e);
          }).finally(() => {
            set({ syncingAction: null });
          });
        }
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
              lastCouponCode: s.lastCouponCode,
      }),
    }
  )
);

// ============================================================
// Phase 1.1: mappers between Supabase OrderRow and local Order shape.
// Order items are NOT fetched here (would need a second roundtrip);
// they're lazily loaded when the user opens an order detail page in
// Phase 1.3.
import type { OrderRow } from './api';
function mapRemoteOrderToLocal(remote: OrderRow): Order {
  return {
    id: remote.id,
    createdAt: new Date(remote.created_at).getTime(),
    items: [], // filled on demand from /api/orders/[id] in Phase 1.3
    total: Number(remote.total),
    // SQL enum uses 'completed'; local shape uses 'delivered' for the same
    // terminal state. Phase 2 normalises the local enum when admin orders
    // gets a real backend.
    status: remote.status === 'completed' ? 'delivered' : remote.status,
    payment: remote.payment_id
      ? ({
          amount: Number(remote.total),
          currency: remote.currency as 'USD' | 'CNY' | 'EUR',
          status: remote.payment_status,
          authCode: remote.payment_id,
          // method / brand / bin / last4 come from the payments table in
          // Phase 1.2 when Stripe webhook lands. For now we leave them out
          // and the order detail page falls back to a placeholder block.
        } as Partial<Order['payment']> as Order['payment'])
      : undefined,
    cancelledAt: remote.cancelled_at
      ? new Date(remote.cancelled_at).getTime()
      : undefined,
  };
}
