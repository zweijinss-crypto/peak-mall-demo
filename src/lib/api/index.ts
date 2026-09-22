/**
 * api barrel — single import surface for all Supabase-backed APIs.
 *
 * Usage:
 *   import { fetchMyOrders, createOrder, fetchActiveProducts } from '@/lib/api';
 */

export {
  getSupabase,
  isSupabaseConfigured,
} from './supabase-client';

export {
  fetchActiveProducts,
  fetchProductById,
  type Product,
} from './products-api';

export {
  fetchMyOrders,
  fetchOrderById,
  createOrder,
  cancelOwnOrder,
  type OrderRow,
  type OrderItemRow,
} from './orders-api';

export {
  fetchMyCart,
  saveMyCart,
  fetchMyWishlist,
  toggleMyWish,
  fetchMyAddresses,
  insertAddress,
  deleteAddress,
  type CartItemPayload,
  type AddressRow,
} from './user-state-api';

export {
  fetchAllProducts,
  updateProduct,
  archiveProduct,
} from './admin-products-api';

export {
  fetchAllOrdersForAdmin,
  shipOrder,
  completeOrder,
  adminCancelOrder,
  refundOrder,
  type AdminOrderRow,
  type RefundResult,
} from './admin-orders-api';

export {
  fetchAllUsers,
  setUserStatus,
  setUserRole,
  type AdminUserRow,
} from './admin-users-api';

export {
  useSyncStatus,
} from './sync-status';

export {
  createCheckoutSession,
  parseCheckoutReturn,
  type CheckoutResult,
  type CheckoutLineItem,
  type CheckoutAddress,
} from './checkout-api';

export { isStripeBrowserConfigured } from './stripe-browser';
