/**
 * admin-products-api — admin-side products CRUD (Supabase).
 *
 * In Supabase mode:
 *   - list:   admin reads from public.products (RLS: is_admin())
 *   - update: admin writes (status, price, stock, etc.)
 *   - create: admin only
 *   - delete: admin only (sets status=0 soft delete in Phase 2)
 *
 * Falls back to localStorage adminStore.products when Supabase
 * isn't configured (the demo keeps its seed data).
 */

import { getSupabase } from './supabase-client';
import type { AdminProduct } from '../admin/fixtures';

interface RemoteProduct {
  id: number;
  name: { zh: string; en: string };
  category: { zh: string; en: string };
  description: { zh: string; en: string };
  price: number;
  compare_price: number | null;
  cost: number | null;
  stock: number;
  stock_alert: number;
  images: string[];
  cover: string;
  status: number;
  seo_slug: string | null;
  created_at: string;
  updated_at: string;
}

function remoteToAdmin(r: RemoteProduct): AdminProduct {
  return {
    id: r.id,
    name: r.name.zh,
    sku: '',
    category: r.category.zh,
    price: Number(r.price),
    comparePrice: r.compare_price ? Number(r.compare_price) : undefined,
    cost: r.cost ? Number(r.cost) : undefined,
    stock: r.stock,
    stockAlert: r.stock_alert,
    description: r.description.zh,
    images: r.images,
    cover: r.cover,
    status: r.status === 1,
    seoSlug: r.seo_slug ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function adminToRemote(a: AdminProduct): Partial<RemoteProduct> {
  return {
    name: { zh: a.name, en: a.name },
    category: { zh: a.category, en: a.category },
    description: { zh: a.description, en: a.description },
    price: a.price,
    compare_price: a.comparePrice ?? null,
    cost: a.cost ?? null,
    stock: a.stock,
    stock_alert: a.stockAlert,
    images: a.images,
    cover: a.cover,
    status: a.status ? 1 : 0,
    seo_slug: a.seoSlug ?? null,
  };
}

/** Fetch all products (admin view: includes status=0). */
export async function fetchAllProducts(): Promise<AdminProduct[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-products-api] fetchAllProducts:', error);
    return null;
  }
  return (data ?? []).map(remoteToAdmin);
}

/** Update one product (admin only). */
export async function updateProduct(
  id: number,
  patch: Partial<AdminProduct>,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const remote = adminToRemote(patch as AdminProduct);
  const { error } = await sb.from('products').update(remote).eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-products-api] updateProduct:', error);
    return false;
  }
  return true;
}

/** Soft-delete: set status=0. */
export async function archiveProduct(id: number): Promise<boolean> {
  return updateProduct(id, { status: false } as Partial<AdminProduct>);
}

/**
 * Phase 2.1 — adjust a product's stock by a signed delta with a free-form
 * reason. Records an inventory_movement audit row.
 *
 * Positive delta increases stock (e.g. receiving new shipment).
 * Negative delta decreases stock (e.g. shrinkage, write-off).
 *
 * Returns ok=false with an error code on constraint failures:
 *   - ADJUST_BELOW_RESERVED  (won't drop stock below current reservations)
 *   - NEGATIVE_STOCK
 *   - INVALID_DELTA
 *   - PRODUCT_NOT_FOUND
 */
export async function adjustStock(
  productId: number,
  delta: number,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'NOT_CONFIGURED' };

  const { error } = await sb.rpc('adjust_stock', {
    p_product_id: productId,
    p_delta: delta,
    p_actor: null, // server-side can fill in auth.uid() if needed
    p_reason: reason || 'admin_adjust',
  });
  if (!error) return { ok: true };

  // Postgres exception codes come through as `error.message`
  // e.g. "ADJUST_BELOW_RESERVED"
  return { ok: false, error: error.message || 'UNKNOWN' };
}
