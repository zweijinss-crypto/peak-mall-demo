'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminStore, type AdminOrder, type AdminProduct, type AdminUser, type AdminAgent, type AdminInvite, type AdminTicket, type AdminCommLog, type AdminWd, type AdminRules, type AdminHomeCfg, type AdminSupportCfg } from './fixtures';
import type { Locale } from '../store';

/**
 * useAdminStore — hydrate any admin table from localStorage on mount.
 * Returns [data, setData, mounted, isEn]. After mount, calls to setData
 * also persist to localStorage via the matching adminStore.<key>.write().
 */
export function useAdminStore<K extends AdminStoreKey>(
  key: K,
  transform?: (v: ReturnType<typeof adminStore[K]['read']>) => ReturnType<typeof adminStore[K]['read']>,
): [ReturnType<typeof adminStore[K]['read']>, (v: ReturnType<typeof adminStore[K]['read']>) => void, boolean, boolean] {
  const pathname = usePathname() ?? '';
  const isEn = pathname.startsWith('/en/') || pathname === '/en';
  const initial = adminStore[key].read() as any;
  const [data, setData] = useState<any>(transform ? transform(initial) : initial);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setData(transform ? transform(adminStore[key].read() as any) : (adminStore[key].read() as any));
    setMounted(true);
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