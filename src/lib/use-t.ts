'use client';

import { usePathname } from 'next/navigation';
import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';
import { COPY_EN } from '@/lib/copy.en';
import { COPY_JA } from '@/lib/copy.ja';
import { COPY_KO } from '@/lib/copy.ko';
import { localeFromPath, type Locale } from '@/lib/locale';

/**
 * useT — locale-aware copy accessor (Phase 3.6.1).
 *
 * URL wins over persisted locale: if the current pathname starts with
 * `/en/` (or `/ja/`, `/ko/`), we return that locale's copy regardless
 * of what the store says. Otherwise we honor the user's persisted
 * preference and fall back to Chinese on the very first render before
 * hydration completes.
 *
 * ja/ko fall back to English on a per-key basis — empty stub objects
 * in copy.ja.ts / copy.ko.ts let us add translations incrementally
 * without breaking the route structure.
 *
 * Returns a relaxed `Record<string, any>` so components can reach the
 * long-form English keys (`emailLabel`, `submitLogin`, …) without
 * losing the zh short keys (`email`, `login`, …). This is a deliberate
 * trade-off versus a tight discriminated union.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t.hero.h1}</h1>
 */
export function useT(): Record<string, any> {
  const pathname = usePathname() ?? '';
  const persistedLocale = usePeakStore((s) => s.locale);
  const pathLocale: Locale = localeFromPath(pathname);
  // URL wins over persisted locale.
  const effective: Locale = pathLocale !== 'zh' ? pathLocale : (persistedLocale as Locale ?? 'zh');
  switch (effective) {
    case 'en':
      return COPY_EN as unknown as Record<string, any>;
    case 'ja':
      return (Object.keys(COPY_JA).length > 0 ? (COPY_JA as Record<string, any>) : COPY_EN) as unknown as Record<string, any>;
    case 'ko':
      return (Object.keys(COPY_KO).length > 0 ? (COPY_KO as Record<string, any>) : COPY_EN) as unknown as Record<string, any>;
    case 'zh':
    default:
      return COPY as unknown as Record<string, any>;
  }
}

/**
 * useLocale — return the active locale (URL > store > 'zh').
 */
export function useLocale(): Locale {
  const pathname = usePathname() ?? '';
  const persistedLocale = usePeakStore((s) => s.locale);
  const pathLocale: Locale = localeFromPath(pathname);
  return pathLocale !== 'zh' ? pathLocale : (persistedLocale as Locale ?? 'zh');
}