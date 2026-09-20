'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthed } from '@/lib/admin/auth';

/**
 * AdminGate — client-side guard for every /admin/* page.
 *
 * On mount we read localStorage. If not authed, redirect to /admin/login.
 * We render a lightweight placeholder during the check to avoid flashing
 * the admin chrome before the redirect.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthed()) {
      setOk(true);
    } else {
      setOk(false);
      router.replace('/admin/login');
    }
  }, [router]);

  if (ok !== true) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center text-[13px] text-neutral-500">
        正在校验登录态…
      </div>
    );
  }
  return <>{children}</>;
}