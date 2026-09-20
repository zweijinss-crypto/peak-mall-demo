import type { MetadataRoute } from 'next';

/**
 * force-static required under output: 'export' (Next 15 enforcement).
 */
export const dynamic = 'force-static';

/**
 * robots.txt — allow all crawlers, point them at sitemap.xml.
 *
 * Note: ref-peak-mall pages are dev-only references (raw SPA HTML from
 * peak-mall.com) and are excluded so search engines don't index the
 * recreation.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/ref-peak-mall/'],
      },
    ],
    sitemap: 'https://peak-mall-demo.netlify.app/sitemap.xml',
    host: 'https://peak-mall-demo.netlify.app',
  };
}