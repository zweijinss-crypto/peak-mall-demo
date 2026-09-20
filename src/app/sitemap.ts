import type { MetadataRoute } from 'next';
import { PRODUCTS } from '@/data/products';
import { buildDemoOrders } from '@/lib/pay-fixtures';

/**
 * force-static required under output: 'export' (Next 15 enforces this on
 * metadata routes; without it build fails on /sitemap.xml collection).
 */
export const dynamic = 'force-static';

/**
 * sitemap.xml — Next 14 metadata route. Generates both /zh and /en entries
 * for every static page plus the dynamic shop/[id] and orders/[id] routes.
 *
 * Update priority when shipping new features:
 *   - Home 1.0 (every page links back)
 *   - Conversion funnel (shop / cart / checkout / pay-records) 0.9
 *   - Account area (orders / address / aftersale / commissions / withdraw) 0.6
 *   - Static info (about / funds / team) 0.4
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://peak-mall-demo.netlify.app';
  const now = new Date('2026-09-19T00:00:00Z');

  const staticZh = [
    '',
    '/about',
    '/address',
    '/aftersale',
    '/cart',
    '/checkout',
    '/commissions',
    '/funds',
    '/login',
    '/orders',
    '/pay-records',
    '/profile',
    '/search',
    '/shop-all',
    '/shop-hot',
    '/shop-new',
    '/team',
    '/wishlist',
    '/withdraw',
    '/withdraw-address',
  ];

  const staticEn = staticZh.map((p) => (p === '' ? '/en' : `/en${p}`));

  const shopZh = PRODUCTS.map((p) => ({
    url: `${base}/shop/${p.id}/`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
    alternates: {
      languages: {
        zh: `${base}/shop/${p.id}/`,
        en: `${base}/en/shop/${p.id}/`,
      },
    },
  }));

  const orderZh = buildDemoOrders().map((o) => ({
    url: `${base}/orders/${o.id}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
    alternates: {
      languages: {
        zh: `${base}/orders/${o.id}/`,
        en: `${base}/en/orders/${o.id}/`,
      },
    },
  }));

  const wrap = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority,
    alternates: {
      languages: {
        zh: `${base}${path}`,
        en: `${base}/en${path === '/' ? '' : path}`,
      },
    },
  });

  // Priority buckets
  const zhPages: MetadataRoute.Sitemap = [
    wrap('/', 1.0),
    ...staticZh.slice(1).map((p) => wrap(p, 0.7)),
    ...shopZh,
    ...orderZh,
  ];

  const enPages: MetadataRoute.Sitemap = [
    wrap('/en', 1.0),
    ...staticEn.slice(1).map((p) => wrap(p, 0.7)),
    ...shopZh.map((e) => ({
      ...e,
      url: `${base}/en/shop/${e.url.split('/shop/')[1]}`,
    })),
    ...orderZh.map((e) => ({
      ...e,
      url: `${base}/en/orders/${e.url.split('/orders/')[1]}`,
    })),
  ];

  return [...zhPages, ...enPages];
}