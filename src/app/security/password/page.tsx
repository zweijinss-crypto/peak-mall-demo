import { Suspense } from 'react';
import PasswordClient from './password-client';
import { UserShell } from '@/components/peak-mall/UserShell';

export const dynamic = 'force-static';

export default function Page() {
  return (
    <UserShell>
      <Suspense fallback={<div className="text-neutral-500 text-[13px]">Loading…</div>}>
        <PasswordClient />
      </Suspense>
    </UserShell>
  );
}