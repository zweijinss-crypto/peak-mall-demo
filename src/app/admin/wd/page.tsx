import { makeAdminPage } from '@/lib/admin/page-helper';
import { WdClient } from './wd-client';

export const dynamic = 'force-static';
export default makeAdminPage('wd', WdClient);