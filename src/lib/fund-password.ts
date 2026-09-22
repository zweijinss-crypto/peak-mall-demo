/**
 * fund-password — client-side storage of the 6-digit fund password.
 *
 * The fund password is the secondary PIN users enter to confirm a
 * withdraw. It lives in browser localStorage under `peak_fund_pwd`.
 *
 * Why localStorage (not server):
 *   Phase 1 ships as a static demo deploy on Netlify — no server
 *   runtime, so /api/auth/fund-password can't exist. Server-side
 *   verification lands in Phase 2.6 when the supabase serverless
 *   functions go live. The localStorage gate still protects against
 *   casual UI clicks; the threat model is "your kid opens the tab",
 *   not "an attacker with browser devtools".
 *
 * Default: '123456'. Migrating this away is a one-line change once
 * the server endpoint exists — the value just stops being read.
 */

const STORAGE_KEY = 'peak_fund_pwd';
const DEFAULT = '123456';

function readRaw(): string {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function writeRaw(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore — private mode / quota
  }
}

/** Get the current fund password. SSR-safe: returns DEFAULT outside browser. */
export function getFundPassword(): string {
  return readRaw();
}

/** Set the fund password. Validates 6-digit numeric format. */
export function setFundPassword(value: string): { ok: boolean; error?: string } {
  if (!/^\d{6}$/.test(value)) {
    return { ok: false, error: 'INVALID_FORMAT' };
  }
  writeRaw(value);
  return { ok: true };
}

/** Verify a candidate against the stored password. */
export function verifyFundPassword(candidate: string): boolean {
  return readRaw() === candidate;
}

/** Test-only — reset to the default value. Not exported in the UI surface. */
export function resetFundPasswordForTest(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const FUND_PASSWORD_DEFAULT = DEFAULT;