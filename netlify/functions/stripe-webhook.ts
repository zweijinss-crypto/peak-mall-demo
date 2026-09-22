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
    console.error('[stripe-webhook] signature verification failed:', err);
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // Use service-role key to write regardless of RLS.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { statusCode: 503, body: 'Supabase not configured' };
  }
  const supabase = createClient(url, serviceKey, {
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
    return { statusCode: 200, body: 'Duplicate ignored' };
  } else if (dedupeErr) {
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] dedupe insert failed:', dedupeErr);
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

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] handler crashed:', err);
    return { statusCode: 500, body: 'Handler error' };
  }
};

export { handler };
