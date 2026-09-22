import type { Metadata } from 'next';
import './globals.css';
import CookieBanner from '@/components/peak-mall/CookieBanner';
import { ErrorBoundary } from '@/components/peak-mall/ErrorBoundary';
import SupportWidget from '@/components/peak-mall/SupportWidget';
import SupabaseSyncBoot from '@/components/peak-mall/SupabaseSyncBoot';
import SyncErrorToast, { SyncErrorWatcher } from '@/components/peak-mall/SyncErrorToast';
import { PostHogProvider } from '@/components/peak-mall/PostHogProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://peak-mall-demo.netlify.app'),
  title: {
    default: 'Peak Mall Demo',
    template: '%s · Peak Mall',
  },
  description:
    'Static e-commerce demo — 16 SKUs across categories, bilingual zh + en, dark/light aware.',
  applicationName: 'Peak Mall',
  keywords: ['peak mall', 'demo', 'next.js', 'bilingual', 'ecommerce'],
  authors: [{ name: 'Peak Mall Demo' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Peak Mall',
    title: 'Peak Mall Demo',
    description:
      'Static e-commerce demo — 16 SKUs across categories, bilingual zh + en.',
    locale: 'zh_CN',
    alternateLocale: ['en_US', 'ja_JP', 'ko_KR'],
    url: 'https://peak-mall-demo.netlify.app',
    // Phase 3.8.2 — 1200x630 social preview card (PNG for broad support)
    images: [
      {
        url: '/og/og.png',
        width: 1200,
        height: 630,
        alt: 'Peak Mall — 16 SKUs bilingual demo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peak Mall Demo',
    description:
      'Static e-commerce demo — 16 SKUs across categories, bilingual zh + en.',
    images: ['/og/twitter-card.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-[var(--color-bg-page)] text-ink-900 font-sans">
        <ErrorBoundary>{children}</ErrorBoundary>
        <CookieBanner />
        {/* Phase 1.1: mirror server state into zustand once per session. */}
        <SupabaseSyncBoot />
        {/* Phase 1.1.6: surface sync failures to the user. */}
        <SyncErrorWatcher />
        <SyncErrorToast />
        <SupportWidget telegram="MementoCare" agent="Memento Care" hours="Mon–Sun · 13:00–23:30 (UTC+8)" />
        {/* Phase 3.5.1 — PostHog analytics (consent-gated). */}
        <PostHogProvider />
      </body>
    </html>
  );
}
