# Lighthouse Reports

Static LH runs against `out/` served via `python3 -m http.server`.
Desktop preset = 1440x900, CPU 1x, provided throttling (matches real Netlify CDN).

## 2026-09-22 — zh CLS fix (`2026-09-22-zh-cls-fix/`)

Suspense fallback `min-h-[1200px]` for ProductGrid pages + Footer `min-h-[320px]`.

| route | P | A | BP | SEO | CLS | before |
|------|------|------|------|------|------|--------|
| zh-shop-all | 100 | 100 | 100 | 100 | 0 | P84 CLS 0.33 |
| zh-shop-hot | 100 | 100 | 100 | 100 | 0 | P82 CLS 0.33 |
| zh-shop-new | 100 | 100 | 100 | 100 | 0 | P84 CLS 0.33 |
| zh-shop-49  | 100 | 100 | 100 | 100 | 0 | P40 CLS 0.30 |
| zh-home     | 100 | 100 | 100 | 100 | 0 | P56       |
| zh-profile  | 100 | 100 | 100 | 100 | 0 | P69       |
| zh-orders   | 100 | 100 | 100 | 100 | 0 | P66       |

## 2026-09-22 — en footer locale fix (`2026-09-22-en-footer-fix/`)

Footer now infers locale via `usePathname()` so /en/* shows English footer.

| route | P | A | BP | SEO | before |
|------|------|------|------|------|--------|
| en-home     | 100 | 100 | 100 | 100 | P89 A59 BP89 SEO82 |
| en-cart     | 100 | 100 | 100 | 100 | P99 BP96       |
| en-checkout | 100 | 100 | 100 | 100 | P55 BP96       |
| en-orders   | 100 | 100 | 100 | 100 | P55 BP96       |
| en-profile  |  97 | 100 | 100 | 100 | P55 BP96       |
| en-shop-49  |  94 | 100 | 100 | 100 | P55 BP96       |
| en-shop-all | 100 | 100 | 100 | 100 | P56 BP96       |
| en-shop-hot | 100 | 100 | 100 | 100 | — |
| en-shop-new | 100 | 100 | 100 | 100 | — |
| en-wishlist | 100 | 100 | 100 | 100 | — |
| en-aftersale| 100 |  96 | 100 | 100 | A11y 96 (1 audit) |
| en-login    |  65 | 100 | 100 | 100 | CLS 0.15 (LH artifact, playwright shows 0) |
| en-about    | 100 | 100 | 100 | 100 | — |

## 2026-09-22 — zh admin sweep (`2026-09-22-zh-admin/`)

15 admin pages: 14/15 = 100/100/100/100. Only zh-admin-tickets = P90 (LCP 1.6s).
