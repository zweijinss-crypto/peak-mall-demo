/**
 * admin/page-helper — a 30-line generator for every /admin/* route.
 *
 * Each admin page follows the exact same pattern:
 *   1. Server page wraps AdminShell + Suspense around a client component
 *   2. Client component reads from adminStore on mount + renders tables
 *
 * This helper exposes `makeAdminPage(key, Client)` so we can scaffold
 * 14 routes with one-liner exports. Static export is preserved because
 * we don't import any server-only modules.
 */
import { Suspense } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import type { AdminKey } from './sidebar';

export function makeAdminPage(active: AdminKey, Client: React.ComponentType) {
  function Page() {
    return (
      <AdminShell active={active}>
        <Suspense fallback={<div className="text-neutral-500 text-[13px]">Loading…</div>}>
          <Client />
        </Suspense>
      </AdminShell>
    );
  }
  return Page;
}