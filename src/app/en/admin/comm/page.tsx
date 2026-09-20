import { makeAdminPage } from '@/lib/admin/page-helper';
import { CommClient } from '@/app/admin/comm/comm-client';
export const dynamic = 'force-static';
export default makeAdminPage('comm', CommClient);
