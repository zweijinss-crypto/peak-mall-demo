/**
 * _shared/logger — JSON-structured logging + Sentry integration for
 * netlify functions.
 *
 * Why structured logs?
 *   Netlify function stdout is shipped to Logflare (Netlify's built-in
 *   log destination). Logflare parses JSON lines and indexes every
 *   key, so emitting one event per line keeps the log dashboard query-
 *   able. Plain console.log concatenates into a single string and is
 *   effectively unsearchable beyond grep.
 *
 * Why Sentry?
 *   When functions throw, console.error is the only signal by default.
 *   Wrapping with Sentry.captureException gives a stack trace, the
 *   request body hash, and a correlation id linking back to the
 *   structured log line.
 *
 * Usage:
 *   import { logger } from './_shared/logger';
 *   try { ... } catch (err) { logger.error('stripe-webhook: signature failed', err); }
 *
 * Falls back to plain console.* when SENTRY_DSN is unset (dev / preview).
 */

import * as Sentry from '@sentry/node';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SERVICE = process.env.SENTRY_SERVICE_NAME ?? 'peak-mall-demo';
const ENV = process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production';

let inited = false;

function init(): void {
  if (inited) return;
  inited = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // Sentry disabled — fall back to stdout JSON only
  try {
    Sentry.init({
      dsn,
      environment: ENV,
      release: process.env.SENTRY_RELEASE ?? undefined,
      // Functions are short-lived; default 0.05 tracesSampleRate is
      // overkill. Keep low.
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
      beforeSend(event) {
        // Strip request URL query strings — they may carry tokens.
        if (event.request?.url) {
          try {
            const u = new URL(event.request.url);
            u.search = '';
            event.request.url = u.toString();
          } catch {
            // ignore
          }
        }
        return event;
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[logger] Sentry init failed:',
      err instanceof Error ? err.message : err,
    );
  }
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  init();
  const line = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    env: ENV,
    msg,
    ...fields,
  };
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(
    JSON.stringify(line),
  );
}

export const logger = {
  debug(msg: string, fields?: Record<string, unknown>) {
    if (process.env.DEBUG) emit('debug', msg, fields);
  },
  info(msg: string, fields?: Record<string, unknown>) {
    emit('info', msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>) {
    emit('warn', msg, fields);
  },
  error(msg: string, err?: unknown, fields?: Record<string, unknown>) {
    const errInfo =
      err instanceof Error
        ? { message: err.message, stack: err.stack, name: err.name }
        : err !== undefined
          ? { value: String(err) }
          : undefined;
    emit('error', msg, { ...fields, err: errInfo });
    if (err instanceof Error && process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { service: SERVICE, env: ENV },
        extra: fields,
      });
    }
  },
  /**
   * Force-flush Sentry events before the function returns. Without
   * this, in-flight captures can be lost when the Lambda container
   * is frozen.
   */
  async flush(timeoutMs = 2000): Promise<void> {
    if (!process.env.SENTRY_DSN) return;
    try {
      await Sentry.flush(timeoutMs);
    } catch {
      // ignore — never let logging block the response
    }
  },
};

export type Logger = typeof logger;