import { makeAdminPage } from '@/lib/admin/page-helper';
import { AuditClient } from './audit-client';

export const dynamic = 'force-static';
export default makeAdminPage('audit', AuditClient, 'audit_log');
