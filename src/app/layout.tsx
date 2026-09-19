import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Peak Mall · Demo',
  description: '参考改写 — components-ts demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-[var(--color-bg-page)] text-ink-900 font-sans">
        {children}
      </body>
    </html>
  );
}
