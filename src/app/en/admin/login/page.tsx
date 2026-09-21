/**
 * /en/admin/login — EN redirect。统一入口 /en/login?tab=admin。
 */
import { redirect } from 'next/navigation';

export const dynamic = 'force-static';

export default function Page() {
  redirect('/en/login?tab=admin');
}