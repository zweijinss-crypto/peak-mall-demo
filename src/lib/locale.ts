/**
 * locale — single source of truth for the active locale + URL detection.
 *
 * Phase 3.6.1 — i18n URL routing. Now supports /zh/* /en/* /ja/* /ko/*.
 *
 * Conventions:
 *   - Root URLs (no /xx/ prefix) are treated as zh.
 *   - /en/...   → 'en'  (full translation in copy.en.ts)
 *   - /ja/...   → 'ja'  (falls back to en until copy.ja.ts lands)
 *   - /ko/...   → 'ko'  (falls back to en until copy.ko.ts lands)
 *   - /admin/... → uses the same URL prefix; no /admin/en/ carve-out
 *
 * Phased rollout: ja/ko fall back to en for missing keys so the URL
 * structure is in place from day one. New copy files can be added
 * later without changing the router or any consumer.
 */

export type Locale = 'zh' | 'en' | 'ja' | 'ko';
export type SupportedLocale = Locale; // alias kept for clarity

export const SUPPORTED_LOCALES: Locale[] = ['zh', 'en', 'ja', 'ko'];
export const DEFAULT_LOCALE: Locale = 'zh';

/**
 * Detect the locale from a URL pathname. Falls back to DEFAULT_LOCALE.
 *
 * `pathname` should not include the query string.
 */
export function localeFromPath(pathname: string): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  const segments = pathname.split('/').filter(Boolean);
  const head = segments[0]?.toLowerCase();
  if (head === 'en') return 'en';
  if (head === 'ja') return 'ja';
  if (head === 'ko') return 'ko';
  return DEFAULT_LOCALE;
}

/**
 * Whether a given pathname lives under a localized segment (i.e. the
 * first segment is one of SUPPORTED_LOCALES). False for root and for
 * paths like /admin/...
 */
export function isLocalizedPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const head = segments[0]?.toLowerCase();
  return SUPPORTED_LOCALES.includes(head as Locale);
}

/**
 * Strip the locale segment from a pathname, returning the "rest".
 *
 *   stripLocale('/en/login')            → '/login'
 *   stripLocale('/ja/admin/orders')     → '/admin/orders'
 *   stripLocale('/')                    → '/'
 *   stripLocale('/admin/dashboard')     → '/admin/dashboard'
 */
export function stripLocale(pathname: string): string {
  if (!isLocalizedPath(pathname)) return pathname;
  const idx = pathname.indexOf('/', 1);
  if (idx === -1) return '/';
  return pathname.slice(idx) || '/';
}

/**
 * Build a path under a given locale.
 *
 *   withLocale('en', '/login')        → '/en/login'
 *   withLocale('zh', '/login')        → '/login'
 *   withLocale('ja', '/admin/audit')  → '/ja/admin/audit'
 */
export function withLocale(locale: Locale, rest: string): string {
  if (locale === DEFAULT_LOCALE) return rest;
  const trimmed = rest.startsWith('/') ? rest : '/' + rest;
  return `/${locale}${trimmed === '/' ? '' : trimmed}`;
}

/**
 * UI labels for the locale switcher. Keep small — full names are
 * intentionally localised in their own script.
 */
export const LOCALE_LABEL: Record<Locale, string> = {
  zh: '简体中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

/** HTML lang attribute per locale. */
export const HTML_LANG: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

/**
 * Locale → Intl.DateTimeFormat default options. Use these so dates
 * feel native in each market without per-component tweaking.
 */
export const LOCALE_DATE_OPTIONS: Record<Locale, Intl.DateTimeFormatOptions> = {
  zh: { year: 'numeric', month: '2-digit', day: '2-digit' },
  en: { year: 'numeric', month: 'short', day: '2-digit' },
  ja: { year: 'numeric', month: 'short', day: '2-digit' },
  ko: { year: 'numeric', month: 'short', day: '2-digit' },
};

/**
 * Format a date with the locale's default Intl options.
 *
 *   formatLocaleDate('2026-09-22', 'ja')  → '2026年9月22日'
 *   formatLocaleDate('2026-09-22', 'en')  → 'Sep 22, 2026'
 *
 * SSR-safe: on the server returns a plain ISO date.
 */
export function formatLocaleDate(
  iso: string | number | Date,
  locale: Locale,
): string {
  if (typeof window === 'undefined') {
    return new Date(iso).toISOString().slice(0, 10);
  }
  try {
    return new Intl.DateTimeFormat(
      HTML_LANG[locale],
      LOCALE_DATE_OPTIONS[locale],
    ).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(0, 10);
  }
}
