'use client';

import { usePathname } from 'next/navigation';
import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';
import { COPY_EN } from '@/lib/copy.en';

/**
 * useT — locale-aware copy accessor.
 *
 * URL wins over persisted locale: if the current pathname starts with `/en/`
 * (or is exactly `/en`), we return the English copy regardless of what the
 * store says. Otherwise we honor the user's persisted preference and fall
 * back to Chinese on the very first render before hydration completes.
 *
 * Returns a relaxed `Record<string, any>` so components can reach the
 * long-form English keys (`emailLabel`, `submitLogin`, …) without losing
 * the zh short keys (`email`, `login`, …). This is a deliberate trade-off
 * versus a tight discriminated union: i18n coverage grows in fits and
 * starts, and we don't want a missing key on one side to block shipping.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t.hero.h1}</h1>
 */
export function useT(): Record<string, any> {
  const pathname = usePathname() ?? '';
  const locale = usePeakStore((s) => s.locale);
  const isEnPath = pathname === '/en' || pathname.startsWith('/en/');
  // URL wins over persisted locale. Persisted locale still drives non-/en/* paths.
  const wantEn = isEnPath || locale === 'en';
  return (wantEn ? COPY_EN : COPY) as unknown as Record<string, any>;
}