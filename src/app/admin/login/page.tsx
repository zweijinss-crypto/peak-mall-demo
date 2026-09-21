/**
 * /admin/login — 兼容 redirect。
 *
 * 设计:统一入口是 /login?tab=admin。这里保留旧 URL 做 redirect,
 * 避免书签和外部链接失效(团队历史 / 文档)。
 */
import { redirect } from 'next/navigation';

export const dynamic = 'force-static';

export default function Page() {
  redirect('/login?tab=admin');
}