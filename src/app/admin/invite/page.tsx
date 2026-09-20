import { makeAdminPage } from '@/lib/admin/page-helper';
import { InviteClient } from './invite-client';

export const dynamic = 'force-static';
export default makeAdminPage('invite', InviteClient);