import { Suspense } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { DashboardClient } from '@/app/admin/dashboard/dashboard-client';
export const dynamic = 'force-static';
export default function Page() {
  return (
    <AdminShell active="dashboard">
      <Suspense fallback={<div className="text-neutral-500 text-[13px]">Loading…</div>}>
        <DashboardClient />
      </Suspense>
    </AdminShell>
  );
}
