import { makeAdminPage } from '@/lib/admin/page-helper';
import { HomeClient } from './home-client';

export const dynamic = 'force-static';
export default makeAdminPage('home', HomeClient, 'home_cfg');