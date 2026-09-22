/**
 * resend-client — server-side Resend SDK wrapper.
 *
 * Lazy-init so missing env vars don't crash the build. Returns null
 * when not configured (callers must check before use and fall back to
 * console logging).
 *
 * Server-only: import only from netlify/functions or server code.
 * Never import this from client components — the API key would leak.
 *
 * Env:
 *   RESEND_API_KEY      — re_...
 *   RESEND_FROM         — "Brand <noreply@yourdomain.com>"
 */

import { Resend } from 'resend';

interface ResendHolder {
  client: Resend;
  from: string;
}

let cached: ResendHolder | null = null;
let reportedMissing = false;

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override default from address */
  from?: string;
  /** Reply-to header */
  replyTo?: string;
}

export function getResend(): ResendHolder | null {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Peak Mall <onboarding@resend.dev>';

  if (!key) {
    if (!reportedMissing && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[resend-client] RESEND_API_KEY not set — emails will be logged to console only.',
      );
      reportedMissing = true;
    }
    return null;
  }

  if (!cached) {
    cached = { client: new Resend(key), from };
  }
  return cached;
}

/**
 * Send a transactional email. Returns { ok, id | error }.
 * When RESEND_API_KEY is missing, the message is logged and reported
 * as ok:true with id:'console-only' so the calling code doesn't have
 * to special-case dev environments.
 */
export async function sendEmail(
  msg: EmailMessage,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const holder = getResend();

  if (!holder) {
    const fallbackFrom = process.env.RESEND_FROM ?? 'Peak Mall <onboarding@resend.dev>';
    // eslint-disable-next-line no-console
    console.log('[resend-client] (no-op) email', {
      to: msg.to,
      subject: msg.subject,
      from: msg.from ?? fallbackFrom,
    });
    return { ok: true, id: 'console-only' };
  }

  try {
    const { data, error } = await holder.client.emails.send({
      from: msg.from ?? holder.from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
    });

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? 'unknown Resend error',
      };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}