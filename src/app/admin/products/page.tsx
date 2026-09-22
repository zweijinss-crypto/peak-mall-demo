import { makeAdminPage } from '@/lib/admin/page-helper';
import { ProductsClient } from './products-client';

export const dynamic = 'force-static';
export default makeAdminPage('products', ProductsClient, 'products');