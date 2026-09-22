/**
 * user-state-api — per-user state: cart, wishlist, addresses.
 *
 * Used by client components. Falls back gracefully if Supabase not
 * configured (caller should keep using localStorage).
 */

import { getSupabase } from './supabase-client';

// ============================================================
// cart
// ============================================================

export interface CartItemPayload {
  productId: number;
  qty: number;
  selected?: boolean;
}

export async function fetchMyCart(): Promise<CartItemPayload[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.from('carts').select('items').single();
  if (error) {
    if (error.code === 'PGRST116') return []; // no row yet
    // eslint-disable-next-line no-console
    console.error('[user-state-api] fetchMyCart:', error);
    return null;
  }
  return (data?.items as CartItemPayload[]) ?? [];
}

export async function saveMyCart(items: CartItemPayload[]): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { data: user } = await sb.auth.getUser();
  if (!user.user) return false;

  const { error } = await sb
    .from('carts')
    .upsert({ user_id: user.user.id, items, updated_at: new Date().toISOString() });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[user-state-api] saveMyCart:', error);
    return false;
  }
  return true;
}

// ============================================================
// wishlist
// ============================================================

export async function fetchMyWishlist(): Promise<number[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.from('wishlist').select('product_id');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[user-state-api] fetchMyWishlist:', error);
    return null;
  }
  return (data ?? []).map((r) => r.product_id);
}

export async function toggleMyWish(productId: number): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { data: user } = await sb.auth.getUser();
  if (!user.user) return false;

  const { data: existing } = await sb
    .from('wishlist')
    .select('product_id')
    .eq('user_id', user.user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await sb
      .from('wishlist')
      .delete()
      .eq('user_id', user.user.id)
      .eq('product_id', productId);
    return false; // removed
  } else {
    await sb.from('wishlist').insert({ user_id: user.user.id, product_id: productId });
    return true; // added
  }
}

// ============================================================
// addresses
// ============================================================

export interface AddressRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  region: string;
  detail: string;
  zip: string | null;
  is_default: boolean;
  created_at: string;
}

export async function fetchMyAddresses(): Promise<AddressRow[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[user-state-api] fetchMyAddresses:', error);
    return null;
  }
  return (data ?? []) as AddressRow[];
}

export async function insertAddress(input: {
  name: string;
  phone: string;
  region: string;
  detail: string;
  zip?: string;
  isDefault?: boolean;
}): Promise<AddressRow | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: user } = await sb.auth.getUser();
  if (!user.user) return null;

  if (input.isDefault) {
    await sb
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.user.id);
  }

  const { data, error } = await sb
    .from('addresses')
    .insert({
      user_id: user.user.id,
      name: input.name,
      phone: input.phone,
      region: input.region,
      detail: input.detail,
      zip: input.zip ?? null,
      is_default: input.isDefault ?? false,
    })
    .select('*')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[user-state-api] insertAddress:', error);
    return null;
  }
  return data as AddressRow;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from('addresses').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[user-state-api] deleteAddress:', error);
    return false;
  }
  return true;
}
