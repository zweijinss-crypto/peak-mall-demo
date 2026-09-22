import { makeAdminPage } from '@/lib/admin/page-helper';
import { CommClient } from './comm-client';

export const dynamic = 'force-static';
export default makeAdminPage('comm', CommClient, 'comm');