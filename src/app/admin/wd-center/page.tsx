import { makeAdminPage } from '@/lib/admin/page-helper';
import { WdCenterClient } from './wd-center-client';

export const dynamic = 'force-static';
export default makeAdminPage('wdCenter', WdCenterClient, 'wd');