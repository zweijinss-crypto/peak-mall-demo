/**
 * /en/admin/mfa — EN wrapper for the admin TOTP page.
 *
 * The MFA page is a single client component under /admin/mfa. Rather
 * than duplicating ~140 lines of TOTP logic, the EN route reuses it
 * and only overrides the two hard-coded zh redirects:
 *   - not signed in        → /en/login?tab=admin
 *   - demo mode (no Supabase) → /en/admin/dashboard
 *
 * The component decides the redirect target from the current pathname,
 * so the same file works for both locales.
 */
import MfaPage from '@/app/admin/mfa/page';

export const dynamic = 'force-static';
export default MfaPage;
