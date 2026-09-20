import type { MetadataRoute } from 'next';

/**
 * PWA manifest — covers the static-export site. Next will serve
 * /manifest.webmanifest at the project root and emit the matching
 * <link rel="manifest"> tag from app/layout.tsx.
 *
 * icon.svg is the existing brand mark (orange rounded square + "P");
 * Next will rasterize it to apple-touch-icon and the 192/512 PNG icons
 * used by the installer.
 *
 * force-static is required under output: 'export' — without it Next 15
 * aborts build with "export const dynamic = 'force-static' not configured
 * on /manifest.webmanifest".
 */
export const dynamic = 'force-static';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Peak Mall · Demo',
    short_name: 'Peak Mall',
    description: 'Static e-commerce demo — 16 SKUs, zh + en, dark/light aware.',
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f12',
    theme_color: '#fd560f',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}