import { makeAdminPage } from '@/lib/admin/page-helper';
import { OrdersClient } from '@/app/admin/orders/orders-client';
export const dynamic = 'force-static';
export default makeAdminPage('orders', OrdersClient);
