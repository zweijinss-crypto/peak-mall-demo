'use client';

import { useEffect } from 'react';
import { usePeakStore } from '@/lib/store';

/**
 * SupabaseSyncBoot — once-per-session hydration trigger.
 *
 * Mounts invisibly in the root layout. On mount, if Supabase is
 * configured and the user is signed in, pulls cart / orders /
 * wishlist from the server and mirrors them into the zustand store.
 *
 * Falls back to localStorage when Supabase isn't configured; no-op
 * in that case (the demo keeps its local-first behaviour).
 */
export default function SupabaseSyncBoot() {
  const sync = usePeakStore((s) => s.syncFromServer);
  const synced = usePeakStore((s) => s.syncedFromServer);
  const enabled = usePeakStore((s) => s.supabaseEnabled);

  useEffect(() => {
    if (!enabled || synced) return;
    void sync();
  }, [enabled, synced, sync]);

  return null;
}
