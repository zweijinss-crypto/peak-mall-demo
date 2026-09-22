'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/use-t';

/**
 * PostHogProvider — loads PostHog's browser script (Phase 3.5.1).
 *
 * When NEXT_PUBLIC_POSTHOG_KEY is unset (dev / preview / static demo),
 * the script tag is never appended and the page behaves as if no
 * analytics exist. No cookies, no consent prompt.
 *
 * When configured, PostHog loads via the official snippet. We respect
 * the cookie consent state: only initialize after the user clicks
 * "Accept" on the CookieBanner (storage key 'pm_cookie_consent_v1').
 */
export function PostHogProvider() {
  const t = useT();
  useEffect(() => {
    const key = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '').trim();
    if (!key) return;
    const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').trim();
    // Wait until consent is granted; if never, leave it unloaded.
    let consent: string | null = null;
    try {
      consent = window.localStorage.getItem('pm_cookie_consent_v1');
    } catch { /* noop */ }
    if (consent !== 'accepted') return;

    if ((window as unknown as { posthog?: unknown }).posthog) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `${host.replace(/\/$/, '')}/static/array.js`;
    script.onload = () => {
      try {
        const ph = (window as unknown as { posthog?: { init: (k: string, o: Record<string, unknown>) => void; capture: (e: string) => void } }).posthog;
        if (!ph) return;
        ph.init(key, {
          api_host: host,
          capture_pageview: true,
          capture_pageleave: true,
          disable_session_recording: true,
          // GDPR-friendly defaults
          person_profiles: 'identified_only',
        });
        ph.capture('app_loaded');
      } catch { /* noop */ }
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);
  return null;
}

/**
 * PostHogGate — render the children only when the named flag is on.
 *
 * Reads `isFlagOn` from lib/ab/posthog.ts. SSR-safe (renders nothing
 * on the server). Hydrates on the client.
 */
export function PostHogGate({
  flag,
  uid,
  rolloutPercent,
  children,
  fallback = null,
}: {
  flag: string;
  uid?: string | null;
  rolloutPercent?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await import('@/lib/ab/posthog').then((m) => m.isFlagOn(flag, { uid, rolloutPercent }));
      if (cancelled) return;
      setOn(r === true || r === 'true');
    })();
    return () => { cancelled = true; };
  }, [flag, uid, rolloutPercent]);
  if (on === null) return null;
  return on ? <>{children}</> : <>{fallback}</>;
}
