'use client';

import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';
import { COPY_EN } from '@/lib/copy.en';

/**
 * useT — locale-aware copy accessor.
 *
 * Hydration-safe: reads locale from store (Zustand persist). Falls back to zh
 * on the very first render before persist hydration completes.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t.hero.h1}</h1>
 */
export function useT() {
  const locale = usePeakStore((s) => s.locale);
  return locale === 'en' ? COPY_EN : COPY;
}