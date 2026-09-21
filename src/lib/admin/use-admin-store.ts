'use client';

import { useEffect, useState } from 'react';
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
  useEffect(() => {
    const fresh = (key === 'products' ? migrateProducts(adminStore.products.read() as any) : adminStore[key].read()) as any;
    setData(transform ? transform(fresh) : fresh);
    setMounted(true);
    // If products were migrated, write the upgraded shape back so subsequent
    // reads are stable.
    if (key === 'products') {
      adminStore.products.write(fresh);
    }
  }, [key]);
  const update = (v: any) => {
    setData(v);
    (adminStore[key].write as any)(v);
  };
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