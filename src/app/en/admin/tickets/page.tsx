import { makeAdminPage } from '@/lib/admin/page-helper';
import { TicketsClient } from '@/app/admin/tickets/tickets-client';
export const dynamic = 'force-static';
export default makeAdminPage('tickets', TicketsClient);
