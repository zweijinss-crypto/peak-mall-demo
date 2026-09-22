/**
 * products-api — server-side product fetch (uses anon key, RLS public read).
 *
 * Designed for `force-static` pages: returns a Promise<Product[]>
 * synchronised with src/data/products.ts shape on the client side.
 */

import { getSupabase } from './supabase-client';

export interface Product {
  id: number;
  name: { zh: string; en: string };
  category: { zh: string; en: string };
  description: { zh: string; en: string };
  highlights: Array<{ zh: string; en: string }>;
  long_description: Array<{ zh: string; en: string }>;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  stock: number;
  stockAlert: number;
  images: string[];
  cover: string;
  status: number;
  seoSlug: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * fetchActiveProducts — used at runtime by the catalog/list pages.
 * Returns empty array if Supabase not configured.
 */
export async function fetchActiveProducts(): Promise<Product[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('status', 1)
    .order('created_at', { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[products-api] fetchActiveProducts:', error);
    return [];
  }
  return (data ?? []) as Product[];
}

/**
 * fetchProductById — single product lookup with stock check.
 * Returns null if not found or Supabase not configured.
 */
export async function fetchProductById(id: number): Promise<Product | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[products-api] fetchProductById:', error);
    return null;
  }
  return data as Product;
}
