/**
 * /en/admin/audit — EN wrapper for the audit log page.
 *
 * The audit client reads the locale from the URL via useT(), so the
 * same component renders English copy under /en/admin/audit.
 * super_admin-only — enforced by AdminGateLayout (now shared with
 * /admin/*) and by the audit_log RLS policy.
 */
import { makeAdminPage } from '@/lib/admin/page-helper';
import { AuditClient } from '@/app/admin/audit/audit-client';

export const dynamic = 'force-static';
export default makeAdminPage('audit', AuditClient, 'audit_log');
