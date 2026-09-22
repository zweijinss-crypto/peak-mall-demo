/**
 * admin-mfa-verify — verify a 6-digit TOTP code for an admin and
 * stamp totp_verified_at.
 *
 * Phase 3.2 — two flows:
 *   1. Enroll: caller already has a pending secret (totp_enabled =
 *      false). On first successful verify, set totp_enabled = true.
 *   2. Re-verify: caller already enrolled. Just stamp
 *      totp_verified_at = now().
 *
 * Auth: same internal token gate as the other netlify functions.
 * Caller must be a logged-in admin (the client checks
 * auth.isAuthed() before calling).
 */

import type { Handler } from '@netlify/functions';
import { authenticator } from 'otplib';
import { createClient } from '@supabase/supabase-js';
import { logger } from './_shared/logger';

interface VerifyRequest {
  email: string;
  code: string;        // 6-digit string
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

  let body: VerifyRequest;
  try {
    body = JSON.parse(event.body ?? '{}') as VerifyRequest;
  } catch {
    return { statusCode: 400, body: 'invalid JSON' };
  }

  if (!body.email || !/^\d{6}$/.test(body.code)) {
    return { statusCode: 400, body: 'email + 6-digit code required' };
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: 'supabase not configured' };
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Fetch the secret + current enabled flag in one round-trip.
  const { data: row, error: rErr } = await supabase
    .from('users')
    .select('totp_secret, totp_enabled, role')
    .eq('email', body.email)
    .maybeSingle();
  if (rErr || !row) {
    return { statusCode: 404, body: 'user not found' };
  }
  if (row.role !== 'admin') {
    return { statusCode: 403, body: 'not an admin' };
  }
  if (!row.totp_secret) {
    return { statusCode: 409, body: 'no TOTP secret enrolled; call admin-mfa-enroll first' };
  }

  // Accept +/- 1 step (30s each side) to absorb clock drift. otplib
  // v12's authenticator.checkDelta() takes only (token, secret) and
  // window=0 is exact match; shift epoch via options to evaluate
  // neighbouring slots.
  let matched = false;
  for (const offsetSec of [-30, 0, 30]) {
    authenticator.options = {
      ...authenticator.options,
      epoch: Date.now() / 1000 + offsetSec,
      step: 30,
    };
    const expected = authenticator.generate(row.totp_secret);
    if (expected === body.code) { matched = true; break; }
  }
  if (!matched) {
    logger.warn('admin-mfa-verify: invalid code', { email: body.email });
    await logger.flush();
    return { statusCode: 401, body: 'invalid code' };
  }
  // ok; fall through to persist
  // (unreachable — kept so a future refactor that reintroduces
  // authenticator.verify() doesn't dangle a variable.)

  // First-time enroll flips totp_enabled → true. Subsequent
  // re-verifies just stamp verified_at.
  const update: Record<string, unknown> = { totp_verified_at: new Date().toISOString() };
  if (!row.totp_enabled) update.totp_enabled = true;

  const { error: uErr } = await supabase
    .from('users')
    .update(update)
    .eq('email', body.email);
  if (uErr) {
    logger.error('admin-mfa-verify: persist failed', uErr, { email: body.email });
    return { statusCode: 500, body: 'persist failed' };
  }

  logger.info('admin-mfa-verify: ok', {
    email: body.email,
    enrolledNow: !row.totp_enabled,
  });
  await logger.flush();

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      enrolledNow: !row.totp_enabled,
    }),
  };
};