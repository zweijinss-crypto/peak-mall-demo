/**
 * admin-mfa-enroll — generate a TOTP secret for an admin and persist it.
 *
 * Phase 3.2 — first-time setup. Returns the otpauth URI which the
 * client renders as a QR code; the admin scans it with Google
 * Authenticator / 1Password / Authy. Until they verify a code
 * (admin-mfa-verify), totp_enabled stays false.
 *
 * Auth: caller must already be authenticated as admin (the admin
 * auth lib passes email/password through signInWithPassword first).
 * The function validates the email matches an admin role before
 * issuing the secret.
 *
 * Idempotency: re-enrolling overwrites the prior secret. The admin
 * has to verify a fresh code to lock in the new secret.
 */

import type { Handler } from '@netlify/functions';
import { authenticator } from 'otplib';
import { createClient } from '@supabase/supabase-js';
import { logger } from './_shared/logger';

interface EnrollRequest {
  email: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export const handler: Handler = async (event) => {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (expected) {
    const got = event.headers['x-internal-token'];
    if (got !== expected) {
      return { statusCode: 401, body: 'unauthorized' };
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method not allowed' };
  }

  let body: EnrollRequest;
  try {
    body = JSON.parse(event.body ?? '{}') as EnrollRequest;
  } catch {
    return { statusCode: 400, body: 'invalid JSON' };
  }

  if (!body.email) {
    return { statusCode: 400, body: 'email required' };
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: 'supabase not configured' };
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Confirm caller is an admin before issuing a secret.
  const { data: user, error: uErr } = await supabase
    .from('users')
    .select('role, totp_enabled')
    .eq('email', body.email)
    .maybeSingle();
  if (uErr) {
    logger.error('admin-mfa-enroll: user lookup failed', uErr, { email: body.email });
    return { statusCode: 500, body: 'user lookup failed' };
  }
  if (!user || user.role !== 'admin') {
    return { statusCode: 403, body: 'caller is not an admin' };
  }

  const secret = authenticator.generateSecret();
  // otplib's TOTP options: 30s step, 6-digit code, SHA1 — current
  // Google Authenticator defaults.
  const uri = authenticator.keyuri(body.email, 'Peak Mall Admin', secret);

  const { error: u2 } = await supabase
    .from('users')
    .update({
      totp_secret: secret,
      totp_enabled: false, // stays false until a code is verified
    })
    .eq('email', body.email);
  if (u2) {
    logger.error('admin-mfa-enroll: update failed', u2, { email: body.email });
    return { statusCode: 500, body: 'persist failed' };
  }

  logger.info('admin-mfa-enroll: secret issued', { email: body.email, alreadyEnabled: user.totp_enabled });
  await logger.flush();

  return {
    statusCode: 200,
    body: JSON.stringify({
      secret,         // base32; caller can render as text fallback
      uri,            // otpauth://totp/... — render as QR
      siteUrl: siteUrl(),
    }),
  };
};