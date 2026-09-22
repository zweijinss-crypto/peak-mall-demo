/**
 * uuid.ts — uuid v5 helpers for deterministic seed ids.
 *
 * Why: SSR (Next.js static export) runs server-side first and client-side
 * after. If we used Math.random() for seed ids, the two runs would
 * produce different rows and React would warn on hydration mismatch.
 *
 * Solution: derive a deterministic uuid v5 from the seed's stable key
 * (order_no, code, sku, etc.) using a fixed namespace. The result is
 * stable across runs and machines, so SSR and client agree.
 *
 * For new admin-created rows (no stable key), we fall back to a
 * runtime-generated uuid v4.
 *
 * Note: we don't import the @supabase/supabase-js uuid helper because
 * it's overkill — a tiny hash-to-uuid function is sufficient and keeps
 * the bundle lean.
 */

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // RFC 4122 example namespace

/**
 * uuid v5 — derive a uuid from a name within a fixed namespace.
 * Output is a valid RFC 4122 uuid with version 5 + variant bits set.
 */
function uuidV5(name: string, ns: string): string {
  // Tiny deterministic hash (FNV-1a 32-bit) repeated into 16 bytes.
  const bytes = new Uint8Array(16);
  const hashString = ns + ':' + name;
  for (let i = 0; i < 16; i++) {
    let h = 2166136261;
    for (let j = 0; j < hashString.length; j++) {
      h ^= hashString.charCodeAt(j);
      h = (h * 16777619) >>> 0;
      h = ((h << 13) | (h >>> 19)) >>> 0;
    }
    bytes[i] = (h ^ i) & 0xff;
  }
  // Set version (5) and variant (10) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * seedUuid — deterministic uuid for a seed row keyed by its stable
 * identity (order_no, sku, code, etc.). Same key in → same uuid out,
 * every run, every machine.
 */
export function seedUuid(key: string): string {
  return uuidV5(key, NAMESPACE);
}

/**
 * newUuid — runtime-generated uuid v4 for new admin-created rows.
 * Falls back to a Math.random-based uuid when crypto is unavailable
 * (older browsers, SSR during build).
 */
export function newUuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback — RFC 4122 v4 from Math.random. Sufficient for client-side.
  const b = new Uint8Array(16);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}