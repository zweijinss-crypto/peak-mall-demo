import { makeAdminPage } from '@/lib/admin/page-helper';
import { AgentsClient } from '@/app/admin/agents/agents-client';
export const dynamic = 'force-static';
export default makeAdminPage('agents', AgentsClient);
