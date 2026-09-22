/**
 * admin-products-api — admin-side products CRUD (Supabase).
 *
 * Reads public.products (bilingual name/category/description stored as
 * jsonb) and maps to AdminProduct. Falls back to adminStore.products
 * when Supabase isn't configured.
 *
 * Phase 1.1.9 — public.products.id stays bigserial (number) for cheap
 * indexing; AdminProduct.id is a deterministic uuid derived via
 * seedUuid('product:' + legacyId). The `legacy_id` field carries the
 * numeric form so we can do real .eq('id', legacy_id) updates.
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminProduct, type AdminId } from '../admin/fixtures';
import { seedUuid } from '../admin/uuid';

interface RemoteProduct {
  id: number;
  name: { zh?: string; en?: string };
  category: { zh?: string; en?: string };
  description: { zh?: string; en?: string };
  price: number;
  compare_price: number | null;
  cost: number | null;
  stock: number;
  stock_alert: number;
  images: string[];
  cover: string;
  status: number; // 1 = active, 0 = archived
  seo_slug: string | null;
  created_at: string;
  updated_at: string;
}

function mapJoined(r: RemoteProduct): AdminProduct {
  const name = r.name?.zh ?? r.name?.en ?? `Product ${r.id}`;
  return {
    id: seedUuid(`product:${r.id}`),
    legacy_id: r.id,
    name,
    sku: r.seo_slug ?? `SKU-${r.id}`,
    category: r.category?.zh ?? r.category?.en ?? '—',
    price: Number(r.price),
    comparePrice: r.compare_price ? Number(r.compare_price) : undefined,
    cost: r.cost ? Number(r.cost) : undefined,
    stock: r.stock,
    stockAlert: r.stock_alert,
    description: r.description?.zh ?? r.description?.en ?? '',
    images: r.images,
    cover: r.cover,
    status: r.status === 1,
    seoSlug: r.seo_slug ?? undefined,
    created_at: r.created_at.slice(0, 19),
    updated_at: r.updated_at.slice(0, 19),
  };
}

/** Fetch all products for the admin (phase 1.1.8). */
export async function fetchAllProducts(): Promise<AdminProduct[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('products')
    .select(
      'id, name, category, description, price, compare_price, cost, stock, stock_alert, images, cover, status, seo_slug, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-products-api] fetchAllProducts:', error);
    return null;
  }
  return ((data ?? []) as unknown as RemoteProduct[]).map(mapJoined);
}

/** Update product stock (admin restock). */
export async function setProductStock(
  id: AdminId,
  stock: number,
): Promise<boolean> {
  const all = adminStore.products.read();
  const next = all.map((p) =>
    p.id === id ? { ...p, stock, updated_at: new Date().toISOString().slice(0, 19) } : p,
  );
  adminStore.products.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const product = all.find((p) => p.id === id);
  const numericId = product?.legacy_id;
  if (numericId == null) return true;
  const { error } = await sb
    .from('products')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('id', numericId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-products-api] setProductStock:', error);
    return false;
  }
  return true;
}

/** Toggle product active/archived. */
export async function setProductStatus(
  id: AdminId,
  active: boolean,
): Promise<boolean> {
  const all = adminStore.products.read();
  const next = all.map((p) =>
    p.id === id ? { ...p, status: active, updated_at: new Date().toISOString().slice(0, 19) } : p,
  );
  adminStore.products.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const product = all.find((p) => p.id === id);
  const numericId = product?.legacy_id;
  if (numericId == null) return true;
  const { error } = await sb
    .from('products')
    .update({ status: active ? 1 : 0, updated_at: new Date().toISOString() })
    .eq('id', numericId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-products-api] setProductStatus:', error);
    return false;
  }
  return true;
}