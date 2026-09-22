import type { Metadata } from 'next';
import './globals.css';
import CookieBanner from '@/components/peak-mall/CookieBanner';
import { ErrorBoundary } from '@/components/peak-mall/ErrorBoundary';
import SupportWidget from '@/components/peak-mall/SupportWidget';
import SupabaseSyncBoot from '@/components/peak-mall/SupabaseSyncBoot';
import SyncErrorToast, { SyncErrorWatcher } from '@/components/peak-mall/SyncErrorToast';

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
    alternateLocale: 'en_US',
    url: 'https://peak-mall-demo.netlify.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peak Mall Demo',
    description:
      'Static e-commerce demo — 16 SKUs across categories, bilingual zh + en.',
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
      </body>
    </html>
  );
}
