'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/lib/use-t';
import { canSync, getMyAdminRoles, ROUTE_RESOURCE, type AdminRole } from '@/lib/admin/rbac';

/**
 * AdminRouteGuard — per-route permission gate.
 *
 * Wraps any admin page that needs a specific (resource, action)
 * permission. Reads the caller's admin_roles once on mount, then
 * redirects to /admin/dashboard with `?reason=forbidden` if the
 * caller lacks the required permission.
 *
 * Use:
 *   <AdminRouteGuard resource="orders" action="refund">
 *     <RefundPanel />
 *   </AdminRouteGuard>
 *
 * Defaults to "read" when action isn't given.
 */
export function AdminRouteGuard({
  resource,
  action = 'read',
  children,
}: {
  resource: keyof typeof ROUTE_RESOURCE | string;
  action?: 'read' | 'create' | 'update' | 'delete' | 'refund' | 'payout';
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const t = useT();
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await getMyAdminRoles();
      if (cancelled) return;
      setRoles(r);
      const allowed = canSync(r, resource as any, action);
      if (!allowed) {
        const reasonParam = `?reason=forbidden&need=${encodeURIComponent(`${String(resource)}:${action}`)}`;
        router.replace(`/admin/dashboard${reasonParam}`);
        return;
      }
      setOk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [resource, action, router, pathname]);

  if (ok !== true) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-[13px] text-neutral-500">
        {roles === null ? t.admin.checkingPerms ?? '校验权限中…' : t.admin.noPermission ?? '没有访问权限'}
      </div>
    );
  }
  return <>{children}</>;
}
