/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
  // Reduce unused-JS / unused-CSS payload by trimming framework overhead.
  // (next already treeshakes per-route by default; this enables extra
  // package-level import pruning where possible.)
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'],
  },
  compiler: {
    // Strip console.* calls from production bundles to shave bytes.
    removeConsole: { exclude: ['error', 'warn'] },
  },
  // Static asset caching + content negotiation headers.
  // `output: 'export'` writes these as <meta http-equiv> in served HTML
  // when there is no server (Python http.server, Netlify static, etc.).
  // Netlify honors `Cache-Control` via its CDN config; the browser hint
  // here just makes it explicit for any HTTP server that reads headers.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;