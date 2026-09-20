import LoginClient from '@/app/admin/login/login-client';
import { Suspense } from 'react';

export const dynamic = 'force-static';

export default function Page() {
  return (
    <Suspense fallback={<div className="text-neutral-500 text-[13px] p-6">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}