/**
 * instrumentation-client — Sentry browser init for static export.
 *
 * Next.js 15 calls this once on the client before any page renders.
 * When NEXT_PUBLIC_SENTRY_DSN is unset (e.g. local dev or static
 * preview deployments without Sentry) the init is skipped — no
 * network calls, no console noise.
 *
 * Sample rates:
 *   - tracesSampleRate: 0.1 (10%) — keeps quota healthy for a small
 *     e-commerce demo while still catching real errors
 *   - replaysSessionSampleRate: 0 (no replays; out of scope for now)
 *   - replaysOnErrorSampleRate: 0 (same)
 *
 * To enable browser session replay later, set the two rates to 0.1
 * and 1.0 respectively. Replays capture sensitive PII by default —
 * maskAllText + maskAllInputs are explicit safeguards.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'production',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? undefined,

    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1',
    ),

    // PII scrubbing
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip cookies / authorization headers / query strings before
      // shipping. They can carry auth tokens.
      if (event.request) {
        event.request.cookies = undefined;
        event.request.headers = undefined;
        if (event.request.url) {
          try {
            const u = new URL(event.request.url);
            u.search = '';
            event.request.url = u.toString();
          } catch {
            // ignore — leave URL alone
          }
        }
      }
      return event;
    },
  });
}

export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;