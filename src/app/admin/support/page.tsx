import { makeAdminPage } from '@/lib/admin/page-helper';
import { SupportClient } from './support-client';

export const dynamic = 'force-static';
export default makeAdminPage('support', SupportClient);