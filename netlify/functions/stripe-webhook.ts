/**
 * Netlify Function: stripe-webhook
 *
 * Receives Stripe webhook events, verifies the signature, and updates
 * the corresponding `orders` + `payments` rows in Supabase.
 *
 * Endpoints to register in Stripe Dashboard → Webhooks:
 *   URL:    https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
 *   Events: checkout.session.completed
 *           payment_intent.succeeded
 *           payment_intent.payment_failed
 *           charge.refunded
 *
 * Signing secret: copy from Stripe Dashboard → Webhooks → reveal.
 * Paste into Netlify env as STRIPE_WEBHOOK_SECRET.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
 *   # copy the printed `whsec_...` to .env.local as STRIPE_WEBHOOK_SECRET
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripeServer, getWebhookSecret } from '../../src/lib/api/stripe-server';
import { sendEmail } from '../../src/lib/email/resend-client';
import { orderConfirmation } from '../../src/lib/email/templates';
import { logger } from './_shared/logger';

// Wire format helpers — Stripe + Supabase share little type structure here.
interface OrderUpdate {
  status?: 'paid' | 'shipped' | 'completed' | 'cancelled';
  payment_id?: string;
  payment_status?: 'pending' | 'success' | 'failed' | 'refunded';
  payment_method?: string;
  paid_at?: string;
}

const handler: Handler = async (event) => {
  // Only POST is allowed.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = getStripeServer();
  const webhookSecret = getWebhookSecret();
  if (!stripe || !webhookSecret) {
    logger.warn('stripe-webhook: Stripe not configured', {
      hasStripe: Boolean(stripe),
      hasSecret: Boolean(webhookSecret),
    });
    return { statusCode: 503, body: 'Stripe not configured' };
  }

  const sig = event.headers['stripe-signature'] ?? event.headers['Stripe-Signature'];
  if (!sig) return { statusCode: 400, body: 'Missing stripe-signature' };

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body ?? '',
      sig as string,
      webhookSecret,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.error('stripe-webhook: signature verification failed', err);
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // Use service-role key to write regardless of RLS.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    logger.warn('stripe-webhook: Supabase not configured', {
      hasUrl: Boolean(url),
      hasServiceKey: Boolean(serviceKey),
    });
    return { statusCode: 503, body: 'Supabase not configured' };
  }
  const supabase = createClient<any, 'public', any>(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Idempotency: dedupe via webhook_events table.
  const { error: dedupeErr } = await supabase
    .from('webhook_events')
    .insert({
      id: stripeEvent.id,
      provider: 'stripe',
      event_type: stripeEvent.type,
      payload: stripeEvent as any,
    });
  if (dedupeErr && dedupeErr.code === '23505') {
    // Already processed — Stripe retries on 5xx, so ack and bail.
    logger.info('stripe-webhook: duplicate ignored', { eventId: stripeEvent.id });
    return { statusCode: 200, body: 'Duplicate ignored' };
  } else if (dedupeErr) {
    // eslint-disable-next-line no-console
    logger.error('stripe-webhook: dedupe insert failed', dedupeErr);
    return { statusCode: 500, body: 'Dedupe write failed' };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        const update: OrderUpdate = {
          status: 'paid',
          payment_id: paymentIntentId ?? undefined,
          payment_status: 'success',
          payment_method: 'stripe',
          paid_at: new Date().toISOString(),
        };
        await supabase.from('orders').update(update).eq('id', orderId);
        await supabase.from('payments').insert({
          order_id: orderId,
          provider: 'stripe',
          provider_event: stripeEvent.type,
          provider_intent: paymentIntentId,
          amount: session.amount_total ?? 0,
          currency: session.currency?.toUpperCase() ?? 'USD',
          status: 'success',
          raw_payload: session as any,
        });

        // Phase 1.4 — fire order confirmation email (best-effort, async).
        await fireOrderConfirmation(supabase, orderId, {
          amountTotal: session.amount_total ?? 0,
          currency: session.currency?.toUpperCase() ?? 'USD',
        });

        // Phase 2.1 — convert reserved stock to actual deduction.
        await deductReservedForOrder(supabase, orderId, stripeEvent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = stripeEvent.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (!orderId) break;
        await supabase
          .from('orders')
          .update({ payment_status: 'failed' })
          .eq('id', orderId);
        await supabase.from('payments').insert({
          order_id: orderId,
          provider: 'stripe',
          provider_event: stripeEvent.type,
          provider_intent: pi.id,
          amount: pi.amount,
          currency: pi.currency.toUpperCase(),
          status: 'failed',
          raw_payload: pi as any,
        });

        // Phase 2.1 — release reserved stock back to inventory.
        await releaseReservedForOrder(supabase, orderId, stripeEvent.id, 'payment_failed');
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        const orderId = charge.metadata?.order_id;
        if (!orderId) break;
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded', status: 'cancelled' })
          .eq('id', orderId);
        await supabase.from('payments').insert({
          order_id: orderId,
          provider: 'stripe',
          provider_event: stripeEvent.type,
          provider_intent: charge.payment_intent as string,
          amount: charge.amount_refunded,
          currency: charge.currency.toUpperCase(),
          status: 'refunded',
          raw_payload: charge as any,
        });

        // Phase 2.1 — refund returns stock. Use 'refund' kind so we
        // don't touch reserved_stock (the order was already deducted
        // at checkout.session.completed time).
        await refundStockForOrder(supabase, orderId, stripeEvent.id);
        break;
      }

      default:
        // Unhandled event types are still recorded as processed (dedupe row)
        // so they don't fire repeatedly.
        break;
    }

    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', stripeEvent.id);

    logger.info('stripe-webhook: processed', {
      eventId: stripeEvent.id,
      type: stripeEvent.type,
    });
    await logger.flush();
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.error('stripe-webhook: handler crashed', err);
    return { statusCode: 500, body: 'Handler error' };
  }
};

export { handler };

// ---------------------------------------------------------------
// Phase 1.4 — email helpers
// ---------------------------------------------------------------

function formatMoney(amountInMinor: number, currency: string): string {
  // Stripe gives amounts in the smallest unit (cents for USD). For
  // zero-decimal currencies (JPY/KRW) the amount IS the major unit.
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'XAF', 'XOF']);
  const major = zeroDecimal.has(currency)
    ? amountInMinor
    : amountInMinor / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

type SupabaseClient = ReturnType<typeof createClient<any, 'public', any>>;
void ({} as SupabaseClient); // suppress unused-type lint when helpers change

async function fireOrderConfirmation(
  supabase: SupabaseClient,
  orderId: string,
  ctx: { amountTotal: number; currency: string },
): Promise<void> {
  try {
    // Look up order + items + buyer email + nickname
    const { data: order } = await supabase
      .from('orders')
      .select(
        'id, order_number, currency, total_amount, user_id, users:user_id(email, nickname)',
      )
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return;

    const buyerEmail = (order as { users?: { email?: string } | null }).users
      ?.email;
    const buyerName = (order as { users?: { nickname?: string } | null }).users
      ?.nickname;
    if (!buyerEmail) {
      logger.warn('stripe-webhook: no buyer email for order — skipping', {
        orderId,
      });
      return;
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, products:product_id(name)')
      .eq('order_id', orderId);

    const list = (items ?? []).map((it) => {
      const row = it as {
        quantity: number;
        unit_price: number;
        products?: { name?: string } | null;
      };
      return {
        name: row.products?.name ?? 'Item',
        quantity: row.quantity,
        priceFormatted: formatMoney(
          Math.round(row.unit_price * row.quantity * 100),
          ctx.currency,
        ),
      };
    });

    const totalFormatted = formatMoney(ctx.amountTotal, ctx.currency);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const rendered = orderConfirmation({
      orderNumber:
        (order as { order_number?: string }).order_number ?? orderId.slice(0, 8),
      customerName: buyerName ?? undefined,
      items: list,
      totalFormatted,
      siteUrl,
      currency: ctx.currency,
    });

    const result = await sendEmail({
      to: buyerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    // Phase 1.4 — audit log
    await supabase.from('email_log').insert({
      user_id: (order as { user_id?: string }).user_id ?? null,
      to_email: buyerEmail,
      kind: 'order_confirmation',
      provider_id: result.ok ? result.id : null,
      status: result.ok ? 'sent' : 'failed',
      error_message: result.ok ? null : result.error,
    });

    logger.info('stripe-webhook: order confirmation email dispatched', {
      orderId,
      to: buyerEmail,
      result,
    });
  } catch (err) {
    // Never block the webhook response on email errors
    logger.error('stripe-webhook: order confirmation email failed', err, {
      orderId,
    });
  }
}

// ---------------------------------------------------------------
// Phase 2.1 — stock helpers
// ---------------------------------------------------------------

async function deductReservedForOrder(
  supabase: SupabaseClient,
  orderId: string,
  eventId: string,
): Promise<void> {
  try {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, product_id, qty')
      .eq('order_id', orderId);
    for (const it of (items ?? []) as Array<{
      id: string;
      product_id: number;
      qty: number;
    }>) {
      const { error } = await supabase.rpc('deduct_stock', {
        p_product_id: it.product_id,
        p_qty: it.qty,
        p_order_id: orderId,
        p_reason: `stripe:${eventId}`,
      });
      if (error) {
        logger.error('stripe-webhook: deduct_stock failed', error, {
          productId: it.product_id,
          qty: it.qty,
          orderId,
        });
      }
    }
  } catch (err) {
    logger.error('stripe-webhook: deductReservedForOrder crashed', err, { orderId });
  }
}

async function releaseReservedForOrder(
  supabase: SupabaseClient,
  orderId: string,
  eventId: string,
  reason: string,
): Promise<void> {
  try {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, product_id, qty')
      .eq('order_id', orderId);
    for (const it of (items ?? []) as Array<{
      id: string;
      product_id: number;
      qty: number;
    }>) {
      const { error } = await supabase.rpc('release_stock', {
        p_product_id: it.product_id,
        p_qty: it.qty,
        p_order_id: orderId,
        p_reason: `${reason}:${eventId}`,
        p_kind: 'release',
      });
      if (error) {
        logger.error('stripe-webhook: release_stock failed', error, {
          productId: it.product_id,
          qty: it.qty,
          orderId,
        });
      }
    }
  } catch (err) {
    logger.error('stripe-webhook: releaseReservedForOrder crashed', err, { orderId });
  }
}

async function refundStockForOrder(
  supabase: SupabaseClient,
  orderId: string,
  eventId: string,
): Promise<void> {
  try {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, product_id, qty')
      .eq('order_id', orderId);
    for (const it of (items ?? []) as Array<{
      id: string;
      product_id: number;
      qty: number;
    }>) {
      const { error } = await supabase.rpc('release_stock', {
        p_product_id: it.product_id,
        p_qty: it.qty,
        p_order_id: orderId,
        p_reason: `refund:${eventId}`,
        p_kind: 'refund',
      });
      if (error) {
        logger.error('stripe-webhook: refund release_stock failed', error, {
          productId: it.product_id,
          qty: it.qty,
          orderId,
        });
      }
    }
  } catch (err) {
    logger.error('stripe-webhook: refundStockForOrder crashed', err, { orderId });
  }
}
