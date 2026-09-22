/**
 * send-email — Netlify function that sends transactional emails via Resend.
 *
 * This is a thin shim that accepts a { kind, to, data } payload and
 * delegates to the matching template. It exists so that backend code
 * (e.g. Stripe webhooks, Supabase DB triggers via supabase-webhook)
 * can hit a single endpoint instead of building direct Resend calls.
 *
 * Auth: requires header `x-internal-token` matching env INTERNAL_API_TOKEN.
 * Skip auth check when INTERNAL_API_TOKEN is unset (dev only — the
 * function logs a warning).
 *
 * Env:
 *   RESEND_API_KEY          — re_...
 *   RESEND_FROM             — "Brand <noreply@...>"
 *   INTERNAL_API_TOKEN      — shared secret for cross-service auth
 *   NEXT_PUBLIC_SITE_URL    — fallback site URL
 */
import type { Handler } from '@netlify/functions';
import { sendEmail } from '../../src/lib/email/resend-client';
import { logger } from './_shared/logger';
import {
  orderConfirmation,
  shipmentNotification,
  passwordReset,
  welcome,
  refundNotification,
} from '../../src/lib/email/templates';

interface SendEmailRequest {
  kind:
    | 'order_confirmation'
    | 'shipment_notification'
    | 'password_reset'
    | 'welcome'
    | 'refund_notification';
  to: string;
  data: Record<string, unknown>;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export const handler: Handler = async (event) => {
  // Auth check
  const expected = process.env.INTERNAL_API_TOKEN;
  if (expected) {
    const got = event.headers['x-internal-token'];
    if (got !== expected) {
      return { statusCode: 401, body: 'unauthorized' };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    logger.warn('send-email: INTERNAL_API_TOKEN unset — no auth (dev only)');
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method not allowed' };
  }

  let body: SendEmailRequest;
  try {
    body = JSON.parse(event.body ?? '{}') as SendEmailRequest;
  } catch {
    return { statusCode: 400, body: 'invalid JSON' };
  }

  if (!body.kind || !body.to || !body.data) {
    return { statusCode: 400, body: 'missing fields' };
  }

  const site = siteUrl();
  const data = { ...body.data, siteUrl: (body.data as { siteUrl?: string }).siteUrl ?? site };

  let rendered: { subject: string; html: string; text: string };
  switch (body.kind) {
    case 'order_confirmation':
      rendered = orderConfirmation(
        data as unknown as Parameters<typeof orderConfirmation>[0],
      );
      break;
    case 'shipment_notification':
      rendered = shipmentNotification(
        data as unknown as Parameters<typeof shipmentNotification>[0],
      );
      break;
    case 'password_reset':
      rendered = passwordReset(
        data as unknown as Parameters<typeof passwordReset>[0],
      );
      break;
    case 'welcome':
      rendered = welcome(data as unknown as Parameters<typeof welcome>[0]);
      break;
    case 'refund_notification':
      rendered = refundNotification(
        data as unknown as Parameters<typeof refundNotification>[0],
      );
      break;
    default:
      return { statusCode: 400, body: `unknown kind: ${body.kind}` };
  }

  const result = await sendEmail({
    to: body.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (!result.ok) {
    // eslint-disable-next-line no-console
    logger.error('send-email: Resend dispatch failed', result.error, {
      kind: body.kind,
      to: body.to,
    });
    await logger.flush();
    return { statusCode: 502, body: JSON.stringify({ error: result.error }) };
  }

  logger.info('send-email: dispatched', {
    kind: body.kind,
    to: body.to,
    id: result.id,
  });
  await logger.flush();
  return {
    statusCode: 200,
    body: JSON.stringify({ id: result.id, kind: body.kind }),
  };
};