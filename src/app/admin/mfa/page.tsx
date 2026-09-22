'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthed } from '@/lib/admin/auth';
import { getCurrentUser } from '@/lib/auth';
import { enrollAdminMfa, verifyAdminMfa } from '@/lib/admin/mfa-api';
import { useT } from '@/lib/use-t';

export const dynamic = 'force-static';

/**
 * /admin/mfa — enroll / re-verify admin TOTP.
 *
 * Flow:
 *   - If the caller is not authenticated as admin: redirect to /admin/login.
 *   - State A: no TOTP enrolled. Show "Enroll" button. Click → calls
 *     enrollAdminMfa, gets back { secret, uri }. Render QR code (qrcode
 *     npm) + manual entry fallback. Ask for 6-digit code, submit calls
 *     verifyAdminMfa, on success route to /admin/dashboard.
 *   - State B: already enrolled. Show "Reverify" input only. Submit
 *     stamps totp_verified_at; on success route to /admin/dashboard.
 */
export default function MfaPage() {
  const router = useRouter();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; uri: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthed()) {
      router.replace('/admin/login');
      return;
    }
    // Demo mode (no Supabase env) — 2FA enrollment isn't available
    // without a real backend. Send the user to the dashboard.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      router.replace('/admin/dashboard');
      return;
    }
    const u = getCurrentUser();
    if (u?.email) setEmail(u.email);
  }, [router]);

  const onEnroll = async () => {
    if (!email) return;
    setBusy(true);
    setErr(null);
    const r = await enrollAdminMfa(email);
    if (!r) {
      setErr(t.enrollErrorNetwork);
      setBusy(false);
      return;
    }
    // Render QR via the qrcode lib (browser side).
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(r.uri, { width: 220, margin: 1 });
    setEnroll({ secret: r.secret, uri: r.uri, qrDataUrl });
    setBusy(false);
  };

  const onVerify = async () => {
    if (!email || !/^\d{6}$/.test(code)) {
      setErr(t.mfaCodeInvalid);
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await verifyAdminMfa(email, code);
    if (!r.ok) {
      setErr(r.error ?? t.mfaVerifyFailed);
      setBusy(false);
      return;
    }
    router.replace('/admin/dashboard');
  };

  return (
    <main className="min-h-[80vh] flex items-start justify-center px-5 py-12">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-7 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <h1 className="text-[22px] font-bold text-neutral-800 mb-1">{t.mfaTitle}</h1>
        <p className="text-[13px] text-neutral-500 mb-5">{t.mfaSubtitle}</p>
        {!mounted || !email ? (
          <div className="text-[13px] text-neutral-500">Loading…</div>
        ) : null}

        {!enroll ? (
          <button
            type="button"
            onClick={onEnroll}
            disabled={busy}
            className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-bold rounded-md transition-colors disabled:opacity-60"
          >
            {busy ? '...' : t.mfaStartEnroll}
          </button>
        ) : (
          <>
            <p className="text-[13px] text-neutral-700 mb-3">{t.mfaScanHint}</p>
            <div className="flex justify-center mb-4">
              <img src={enroll.qrDataUrl} alt="TOTP QR code" width="220" height="220" className="border border-neutral-200 rounded" />
            </div>
            <details className="mb-4 text-[12px] text-neutral-500">
              <summary className="cursor-pointer hover:text-neutral-700">{t.mfaManualEntry}</summary>
              <code className="block mt-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded font-mono text-[12px] break-all">
                {enroll.secret}
              </code>
            </details>

            <label htmlFor="mfa-code" className="block text-[12.5px] font-medium text-neutral-700 mb-1.5">
              {t.mfaCodeLabel}
            </label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              aria-label={t.mfaCodeLabel}
              className="w-full px-3 py-2.5 text-center text-[20px] tracking-[0.4em] font-mono border border-neutral-300 rounded-md mb-3 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

            <button
              type="button"
              onClick={onVerify}
              disabled={busy || !/^\d{6}$/.test(code)}
              className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white text-[14px] font-bold rounded-md transition-colors disabled:opacity-60"
            >
              {busy ? '...' : t.mfaVerify}
            </button>
          </>
        )}

        {err && (
          <div role="alert" className="mt-4 px-3 py-2.5 rounded text-[13px] bg-rose-50 text-rose-700 border border-rose-200">
            {err}
          </div>
        )}
      </div>
    </main>
  );
}