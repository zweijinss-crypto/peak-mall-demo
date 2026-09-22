import { makeAdminPage } from '@/lib/admin/page-helper';
import { UsersClient } from './users-client';

export const dynamic = 'force-static';
export default makeAdminPage('users', UsersClient, 'users');