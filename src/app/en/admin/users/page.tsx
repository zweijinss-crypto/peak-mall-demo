import { makeAdminPage } from '@/lib/admin/page-helper';
import { UsersClient } from '@/app/admin/users/users-client';
export const dynamic = 'force-static';
export default makeAdminPage('users', UsersClient);
