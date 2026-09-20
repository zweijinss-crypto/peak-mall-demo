import { Suspense } from 'react';
import FundPasswordClient from './fund-password-client';
import { UserShell } from '@/components/peak-mall/UserShell';

export const dynamic = 'force-static';

export default function Page() {
  return (
    <UserShell>
      <Suspense fallback={<div className="text-neutral-500 text-[13px]">Loading…</div>}>
        <FundPasswordClient />
      </Suspense>
    </UserShell>
  );
}