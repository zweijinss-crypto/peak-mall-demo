import { PRODUCTS } from '@/data/products';

/**
 * isKnownProductId — server-side guard used by /shop/[id]/page.tsx to call
 * notFound() for ids outside the static export's generateStaticParams set.
 *
 * Lives in its own .ts (no 'use client') so it can be called from the server
 * component. Mirrors PRODUCTS shape from @/data/products — kept inline to
 * avoid cross-importing from a client module.
 */
export function isKnownProductId(id: string | number): boolean {
  return PRODUCTS.some((p) => p.id === Number(id));
}