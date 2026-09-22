import { makeAdminPage } from '@/lib/admin/page-helper';
import { AgentsClient } from './agents-client';

export const dynamic = 'force-static';
export default makeAdminPage('agents', AgentsClient, 'agents');