import { makeAdminPage } from '@/lib/admin/page-helper';
import { DemoClient } from '@/app/admin/demo/demo-client';
export const dynamic = 'force-static';
export default makeAdminPage('demo', DemoClient);
