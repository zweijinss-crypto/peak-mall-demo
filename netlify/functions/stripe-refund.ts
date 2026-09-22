/**
 * stripe-refund — admin-initiated partial or full refund.
 *
 * Phase 2.4 — replaces the previous optimistic-only refund button in
 * the admin orders UI. The flow:
 *
 *   1. Authenticate the caller as admin (admin API token).
 *   2. Validate the order is in a refundable state (paid / shipped /
 *      completed) and the requested amount does not exceed the
 *      remaining refundable balance.
 *   3. Insert an `order_refunds` row with status='pending'.
 *   4. Call Stripe `refunds.create` against the order's payment
 *      intent (or charge).
 *   5. On Stripe success, update the row to 'succeeded' and call
 *      `recompute_order_refund_state` to roll up orders.refund_*.
 *      Fire the refund_notification email (best-effort).
 *   6. On Stripe failure, mark the row 'failed' with error_message.
 *
 * The Stripe webhook (charge.refunded / refund.* events) is the
 * authoritative source of truth — if it later reports a different
 * state, the webhook will reconcile via recompute_order_refund_state.
 */

import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './_shared/logger';
import { sendEmail } from '../../src/lib/email/resend-client';
import { refundNotification } from '../../src/lib/email/templates';

interface RefundRequest {
  orderId: string;
  /** Refund amount in major units (e.g. dollars), must be > 0. */
  amount: number;
  /** Optional admin-typed reason; surfaced in the audit row and email. */
  reason?: string;
  /** Optional free-form note for the audit log. */
  note?: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function formatMoney(n: number, currency?: string): string {
  const cur = (currency ?? 'USD').toUpperCase();
  // Lightweight format; the email template escapes it before HTML.
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

export const handler: Handler = async (event) => {
  // ---------- Auth ----------
  const expected = process.env.INTERNAL_API_TOKEN;
  if (expected) {
    const got = event.headers['x-internal-token'];
    if (got !== expected) {
      return { statusCode: 401, body: 'unauthorized' };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    logger.warn('stripe-refund: INTERNAL_API_TOKEN unset — no auth (dev only)');
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method not allowed' };
  }

  let body: RefundRequest;
  try {
    body = JSON.parse(event.body ?? '{}') as RefundRequest;
  } catch {
    return { statusCode: 400, body: 'invalid JSON' };
  }

  if (!body.orderId || typeof body.amount !== 'number' || body.amount <= 0) {
    return { statusCode: 400, body: 'orderId and positive amount are required' };
  }

  // ---------- Clients ----------
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 500, body: 'stripe not configured' };
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: 'supabase not configured' };
  }
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // ---------- Load order ----------
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_no, total, refund_amount, refund_state, status, currency, user_id')
    .eq('id', body.orderId)
    .maybeSingle();

  if (orderErr) {
    logger.error('stripe-refund: order lookup failed', orderErr);
    return { statusCode: 500, body: 'order lookup failed' };
  }
  if (!order) {
    return { statusCode: 404, body: 'order not found' };
  }

  // ---------- Validate ----------
  if (order.status === 'pending' || order.status === 'cancelled') {
    return {
      statusCode: 409,
      body: `cannot refund order in status '${order.status}'`,
    };
  }
  const alreadyRefunded = Number(order.refund_amount ?? 0);
  const remaining = Number(order.total) - alreadyRefunded;
  if (body.amount > remaining + 0.005) {
    return {
      statusCode: 409,
      body: `requested amount ${body.amount} exceeds remaining refundable ${remaining.toFixed(2)}`,
    };
  }

  // ---------- Find the payment intent ----------
  // We need Stripe's pi_… / ch_… to issue the refund. They're stored
  // on the payments table by the webhook at charge time. Schema
  // columns are provider_intent (pi_…) and provider_event (event id);
  // charge id is not stored — when the webhook receives
  // `charge.refunded` it pairs the charge back to the order via the
  // payment_intent (provider_intent) field.
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('provider_intent, provider, status')
    .eq('order_id', order.id)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payErr) {
    logger.error('stripe-refund: payment lookup failed', payErr);
    return { statusCode: 500, body: 'payment lookup failed' };
  }
  if (!payment?.provider_intent) {
    return {
      statusCode: 409,
      body: 'no successful Stripe payment recorded for this order',
    };
  }

  // ---------- Insert pending audit row ----------
  const { data: auditRow, error: insertErr } = await supabase
    .from('order_refunds')
    .insert({
      order_id: order.id,
      amount: body.amount,
      currency: order.currency ?? 'USD',
      reason: body.reason ?? null,
      note: body.note ?? null,
      status: 'pending',
      stripe_payment_intent: payment.provider_intent ?? null,
    })
    .select('id')
    .single();

  if (insertErr || !auditRow) {
    logger.error('stripe-refund: audit insert failed', insertErr);
    return { statusCode: 500, body: 'audit insert failed' };
  }

  // ---------- Call Stripe ----------
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      amount: Math.round(body.amount * 100), // dollars → cents for Stripe
      payment_intent: payment.provider_intent,
      reason: mapReason(body.reason),
      metadata: {
        order_id: order.id,
        order_no: order.order_no ?? '',
        audit_id: auditRow.id,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('stripe-refund: stripe.refunds.create failed', err, {
      orderId: order.id,
      amount: body.amount,
    });
    await supabase
      .from('order_refunds')
      .update({
        status: 'failed',
        error_message: msg,
        processed_at: new Date().toISOString(),
      })
      .eq('id', auditRow.id);
    await logger.flush();
    return { statusCode: 502, body: `stripe refund failed: ${msg}` };
  }

  // ---------- Persist success ----------
  const { error: updErr } = await supabase
    .from('order_refunds')
    .update({
      status: 'succeeded',
      stripe_refund_id: refund.id,
      processed_at: new Date().toISOString(),
    })
    .eq('id', auditRow.id);

  if (updErr) {
    // The Stripe refund succeeded; we just couldn't update our row.
    // The webhook will reconcile when the refund event arrives.
    logger.error('stripe-refund: post-success audit update failed', updErr, {
      orderId: order.id,
      stripeRefundId: refund.id,
    });
  }

  // Roll up order-level state.
  const { error: rpcErr } = await supabase.rpc('recompute_order_refund_state', {
    p_order_id: order.id,
  });
  if (rpcErr) {
    logger.error('stripe-refund: recompute_order_refund_state failed', rpcErr, {
      orderId: order.id,
    });
  }

  // ---------- Audit log (Phase 3.7.2) ----------
  // Best-effort: log_admin_action is SECURITY DEFINER so it runs
  // with the service_role context. If actor_id can't be resolved
  // (e.g. dev tool call), we still log — the actor_id will be null.
  const actorId =
    (event.headers['x-admin-user-id'] as string | undefined) ?? null;
  const actorEmail =
    (event.headers['x-admin-email'] as string | undefined) ?? null;
  try {
    const { error: auditErr } = await supabase.rpc('log_admin_action', {
      p_action: 'order.refund',
      p_resource: 'orders',
      p_resource_id: order.order_no ?? order.id,
      p_before: { refund_amount: alreadyRefunded, status: order.status },
      p_after: {
        refund_amount: alreadyRefunded + body.amount,
        stripe_refund_id: refund.id,
        audit_id: auditRow.id,
      },
      p_metadata: {
        amount: body.amount,
        currency: order.currency,
        reason: body.reason ?? null,
        note: body.note ?? null,
        actor_id: actorId,
        actor_email: actorEmail,
      },
    });
    if (auditErr) {
      logger.warn('stripe-refund: audit_log insert failed', {
        error: String(auditErr),
        orderId: order.id,
      });
    }
  } catch (err) {
    logger.warn('stripe-refund: audit_log call crashed', {
      error: String(err),
      orderId: order.id,
    });
  }

  // ---------- Email (best-effort) ----------
  try {
    const { data: buyer } = await supabase
      .from('users')
      .select('email, nickname, locale')
      .eq('id', (order as { user_id?: string }).user_id ?? '')
      .maybeSingle();
    if (buyer?.email) {
      const buyerLocale = ((buyer as { locale?: string }).locale ?? 'zh') as 'zh' | 'en';
      const html = refundNotification({
        orderNumber: order.order_no ?? '',
        customerName: (buyer as { nickname?: string | null }).nickname ?? undefined,
        refundAmountFormatted: formatMoney(body.amount, order.currency),
        currency: order.currency,
        reason: body.reason,
        siteUrl: siteUrl(),
        locale: buyerLocale,
      });
      // sendEmail returns { ok, id?, error? } via resend-client.
      // Reuse resend-client via dispatchEmail helper to stay DRY.
      const sent = await sendEmail({
        to: buyer.email,
        subject: html.subject,
        html: html.html,
        text: html.text,
      });
      if (!sent.ok) {
        logger.warn('stripe-refund: refund email failed', { error: sent.error, orderId: order.id });
      }
    }
  } catch (err) {
    logger.warn('stripe-refund: email dispatch crashed', { error: String(err), orderId: order.id });
  }

  logger.info('stripe-refund: success', {
    orderId: order.id,
    amount: body.amount,
    stripeRefundId: refund.id,
  });
  await logger.flush();

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      refundId: refund.id,
      auditId: auditRow.id,
      amount: body.amount,
      currency: order.currency,
    }),
  };
};

/** Map a free-form admin reason to Stripe's enum (or omit). */
function mapReason(reason: string | undefined): Stripe.RefundCreateParams.Reason | undefined {
  if (!reason) return undefined;
  const r = reason.toLowerCase();
  if (r.includes('duplicate')) return 'duplicate';
  if (r.includes('fraud')) return 'fraudulent';
  return 'requested_by_customer';
}
