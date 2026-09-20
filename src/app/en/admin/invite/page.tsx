import { makeAdminPage } from '@/lib/admin/page-helper';
import { InviteClient } from '@/app/admin/invite/invite-client';
export const dynamic = 'force-static';
export default makeAdminPage('invite', InviteClient);
