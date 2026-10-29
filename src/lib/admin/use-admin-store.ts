'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { adminStore, SEED_PRODUCTS, type AdminOrder, type AdminProduct, type AdminUser, type AdminAgent, type AdminInvite, type AdminTicket, type AdminCommLog, type AdminWd, type AdminRules, type AdminHomeCfg, type AdminSupportCfg } from './fixtures';
import type { Locale } from '../store';

/**
 * Backfill missing fields on stored products from older schema versions
 * (pre-sku / comparePrice / cost / stockAlert / images / seoSlug / updated_at).
 * Mutates a copy and returns it; never touches the stored array.
 */
function migrateProducts(arr: any[]): AdminProduct[] {
  return arr.map((p, i) => ({
    ...p,
    sku: p.sku ?? `MIGRATED-${p.id}-${i}`,
    comparePrice: p.comparePrice,
    cost: p.cost,
    stockAlert: p.stockAlert ?? 5,
    images: p.images ?? (p.cover ? [p.cover] : ['📦']),
    seoSlug: p.seoSlug,
    updated_at: p.updated_at ?? p.created_at,
  })) as AdminProduct[];
}

export function useAdminStore<K extends 'products'>(
  key: 'products',
  transform?: (v: AdminProduct[]) => AdminProduct[],
): [AdminProduct[], (v: AdminProduct[]) => void, boolean, boolean];
export function useAdminStore<K extends AdminStoreKey>(
  key: K,
  transform?: (v: ReturnType<typeof adminStore[K]['read']>) => ReturnType<typeof adminStore[K]['read']>,
): [ReturnType<typeof adminStore[K]['read']>, (v: ReturnType<typeof adminStore[K]['read']>) => void, boolean, boolean];
export function useAdminStore<K extends AdminStoreKey>(
  key: K,
  transform?: (v: any) => any,
): [any, (v: any) => void, boolean, boolean] {
  const pathname = usePathname() ?? '';
  const isEn = pathname.startsWith('/en/') || pathname === '/en';
  const initial = (key === 'products' ? migrateProducts(adminStore.products.read() as any) : adminStore[key].read()) as any;
  const [data, setData] = useState<any>(transform ? transform(initial) : initial);
  const [mounted, setMounted] = useState(false);
  // Keep `transform` in a ref so the mount effect does not need it as a
  // dependency. Every caller passes a fresh inline closure, so putting it
  // in the dep array would re-run the effect on every render.
  const transformRef = useRef(transform);
  transformRef.current = transform;
  useEffect(() => {
    const fresh = (key === 'products' ? migrateProducts(adminStore.products.read() as any) : adminStore[key].read()) as any;
    const tf = transformRef.current;
    setData(tf ? tf(fresh) : fresh);
    setMounted(true);
    // If products were migrated, write the upgraded shape back so subsequent
    // reads are stable.
    if (key === 'products') {
      adminStore.products.write(fresh);
    }
  }, [key]);
  // Memoized so the returned setter identity is stable across renders —
  // callers put it in useEffect dependency arrays, and an unstable
  // identity would re-run those effects on every render.
  const update = useCallback((v: any) => {
    setData(v);
    (adminStore[key].write as any)(v);
  }, [key]);
  return [data, update, mounted, isEn];
}

export type AdminStoreKey =
  | 'products'
  | 'orders'
  | 'users'
  | 'agents'
  | 'invites'
  | 'tickets'
  | 'comm'
  | 'wd'
  | 'rules'
  | 'homeCfg'
  | 'supportCfg';

export type {
  AdminOrder,
  AdminProduct,
  AdminUser,
  AdminAgent,
  AdminInvite,
  AdminTicket,
  AdminCommLog,
  AdminWd,
  AdminRules,
  AdminHomeCfg,
  AdminSupportCfg,
};

export type { Locale };