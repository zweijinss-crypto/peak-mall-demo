import type { Metadata } from 'next';
import './globals.css';
import CookieBanner from '@/components/peak-mall/CookieBanner';
import SupportWidget from '@/components/peak-mall/SupportWidget';

export const metadata: Metadata = {
  title: 'Peak Mall · Demo',
  description: '参考改写 — components-ts demo',
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
