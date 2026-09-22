/**
 * admin/page-helper — a 30-line generator for every /admin/* route.
 *
 * Each admin page follows the exact same pattern:
 *   1. Server page wraps AdminShell + Suspense around a client component
 *   2. Client component reads from adminStore on mount + renders tables
 *
 * This helper exposes `makeAdminPage(key, Client, resource)` so we can
 * scaffold 14 routes with one-liner exports. Static export is preserved
 * because we don't import any server-only modules.
 *
 * `resource` is the optional RBAC resource for AdminRouteGuard. When
 * omitted, only AdminGate (any admin role) is enforced.
 */
import { Suspense } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminGate } from '@/components/admin/AdminGate';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';
import type { AdminKey } from './sidebar';
import type { AdminResource } from './rbac';

export function makeAdminPage(
  active: AdminKey,
  Client: React.ComponentType,
  resource?: AdminResource,
) {
  function Page() {
    const inner = (
      <AdminGate>
        {resource ? (
          <AdminRouteGuard resource={resource}>
            <Client />
          </AdminRouteGuard>
        ) : (
          <Client />
        )}
      </AdminGate>
    );
    return (
      <AdminShell active={active}>
        <Suspense fallback={<div className="text-neutral-500 text-[13px]">Loading…</div>}>
          {inner}
        </Suspense>
      </AdminShell>
    );
  }
  return Page;
}