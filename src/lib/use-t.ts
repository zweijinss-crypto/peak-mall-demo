'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePeakStore } from '@/lib/store';
import { COPY } from '@/lib/copy';
import { COPY_EN } from '@/lib/copy.en';
import { COPY_JA } from '@/lib/copy.ja';
import { COPY_KO } from '@/lib/copy.ko';
import { localeFromPath, isLocalizedPath, type Locale } from '@/lib/locale';

/**
 * useT — locale-aware copy accessor (Phase 3.6.1 + 3.6.2).
 *
 * Resolution order (writes back to store on first render to defeat
 * any persisted/hydrate race):
 *   1. URL has a locale prefix  → use it (en/ja/ko URL → that copy).
 *   2. URL is root or zh-equivalent → honor persisted preference.
 *      This is the one place where store.locale actually wins.
 *
 * Why write-through:
 *   The Zustand persist middleware rehydrates asynchronously. On the
 *   very first paint we might still be reading the SSR default ('zh')
 *   while localStorage holds e.g. 'en'. If we don't reconcile, the
 *   next render flickers. By setting `setLocale(effective)` here,
 *   we make the store canonical and end any race before consumers
 *   notice. Same logic on every subsequent navigation — if the URL
 *   changed but the store didn't, we sync it back.
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
  const setLocale = usePeakStore((s) => s.setLocale);
  const pathLocale: Locale = localeFromPath(pathname);
  // URL wins on localized paths (/en/, /ja/, /ko/). On root URLs
  // (no /xx/ prefix) the URL is silent and we honor persisted
  // preference so a user who picked English last time still sees
  // English on the bare root.
  const effective: Locale = isLocalizedPath(pathname)
    ? pathLocale
    : persistedLocale;

  // Write-through: keep the store aligned with what we just resolved.
  // Idempotent — Zustand skips no-op updates, so this is cheap on
  // every render and only fires when something actually differs.
  useEffect(() => {
    if (effective !== persistedLocale) setLocale(effective);
  }, [effective, persistedLocale, setLocale]);

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
 * useLocale — return the active locale (URL > persisted).
 *
 * Same rule as useT: once the URL carries a locale prefix (en/ja/ko)
 * we honor it. On zh-equivalent paths we honor the persisted locale
 * (which useT has already reconciled via write-through) so consumers
 * like the language switcher see a single canonical value.
 */
export function useLocale(): Locale {
  const pathname = usePathname() ?? '';
  const persistedLocale = usePeakStore((s) => s.locale);
  const pathLocale: Locale = localeFromPath(pathname);
  return isLocalizedPath(pathname) ? pathLocale : persistedLocale;
}