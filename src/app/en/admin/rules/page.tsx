import { makeAdminPage } from '@/lib/admin/page-helper';
import { RulesClient } from '@/app/admin/rules/rules-client';
export const dynamic = 'force-static';
export default makeAdminPage('rules', RulesClient);
