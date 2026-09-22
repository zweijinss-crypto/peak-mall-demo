/**
 * mfa-api — client-side wrappers for the netlify admin-mfa-* functions.
 */

export interface EnrollResult {
  secret: string;   // base32
  uri: string;      // otpauth://…
  siteUrl: string;
}

export async function enrollAdminMfa(email: string): Promise<EnrollResult | null> {
  try {
    const res = await fetch('/.netlify/functions/admin-mfa-enroll', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN
          ? { 'x-internal-token': process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN }
          : {}),
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return null;
    return (await res.json()) as EnrollResult;
  } catch {
    return null;
  }
}

export interface VerifyResult {
  ok: boolean;
  enrolledNow?: boolean;
  error?: string;
}

export async function verifyAdminMfa(email: string, code: string): Promise<VerifyResult> {
  try {
    const res = await fetch('/.netlify/functions/admin-mfa-verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN
          ? { 'x-internal-token': process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN }
          : {}),
      },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      return { ok: false, error: await res.text().catch(() => `HTTP ${res.status}`) };
    }
    return (await res.json()) as VerifyResult;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}