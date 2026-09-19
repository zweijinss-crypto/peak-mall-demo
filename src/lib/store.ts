import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  cover?: string;
  qty: number;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  cover?: string;
}

export interface Order {
  id: string;
  createdAt: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
}

export interface WishItem {
  id: number;
  addedAt: number;
}

interface PeakStore {
  cart: CartItem[];
  orders: Order[];
  wishlist: WishItem[];
  addToCart: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  updateQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  toggleWish: (id: number) => void;
  placeOrder: () => Order | null;
}

export const usePeakStore = create<PeakStore>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      wishlist: [],

      addToCart: (item, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((c) => c.id === item.id);
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.id === item.id ? { ...c, qty: c.qty + qty } : c
              ),
            };
          }
          return { cart: [...s.cart, { ...item, qty }] };
        }),

      updateQty: (id, qty) =>
        set((s) => ({
          cart: s.cart
            .map((c) => (c.id === id ? { ...c, qty } : c))
            .filter((c) => c.qty > 0),
        })),

      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

      clearCart: () => set({ cart: [] }),

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
        set({ orders: [order, ...s.orders], cart: [] });
        return order;
      },
    }),
    {
      name: 'peak-mall-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cart: s.cart,
        orders: s.orders,
        wishlist: s.wishlist,
      }),
    }
  )
);
