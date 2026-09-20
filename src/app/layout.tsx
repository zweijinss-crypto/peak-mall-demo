import type { Metadata } from 'next';
import './globals.css';
import CookieBanner from '@/components/peak-mall/CookieBanner';
import SupportWidget from '@/components/peak-mall/SupportWidget';

export const metadata: Metadata = {
  metadataBase: new URL('https://peak-mall-demo.netlify.app'),
  title: {
    default: 'Peak Mall · 顶峰商城 Demo',
    template: '%s · Peak Mall',
  },
  description: 'Static e-commerce demo — 16 SKUs across categories, zh + en bilingual, dark/light aware.',
  applicationName: 'Peak Mall',
  keywords: ['peak mall', 'demo', 'next.js', '静态导出', 'bilingual', 'ecommerce'],
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
    title: 'Peak Mall · 顶峰商城 Demo',
    description: 'Static e-commerce demo — 16 SKUs, zh + en bilingual.',
    locale: 'zh_CN',
    alternateLocale: 'en_US',
    url: 'https://peak-mall-demo.netlify.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peak Mall · 顶峰商城 Demo',
    description: 'Static e-commerce demo — 16 SKUs, zh + en bilingual.',
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
        {children}
        <CookieBanner />
        <SupportWidget telegram="MementoCare" agent="Memento Care" hours="Mon–Sun · 13:00–23:30 (UTC+8)" />
      </body>
    </html>
  );
}
