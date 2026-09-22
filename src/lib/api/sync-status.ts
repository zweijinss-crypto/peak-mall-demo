'use client';

import { useEffect } from 'react';
import { usePeakStore } from '@/lib/store';

/**
 * useSyncStatus — surface sync state to consumers.
 *
 * Returns:
 *   - syncingAction:  currently-mirroring action key (UI spinner target)
 *   - syncError:      last sync error key (UI toast)
 *   - dismissError:   clears the error
 *
 * Component usage:
 *   const { syncingAction } = useSyncStatus();
 *   <button disabled={syncingAction === 'addToCart'}>+</button>
 */
export function useSyncStatus() {
  const syncingAction = usePeakStore((s) => s.syncingAction);
  const lastSyncError = usePeakStore((s) => s.lastSyncError);
  const setSyncError = usePeakStore((s) => s.setSyncError);
  const setSyncingAction = usePeakStore((s) => s.setSyncingAction);

  return {
    syncingAction,
    syncError: lastSyncError,
    dismissError: () => setSyncError(null),
    clearSyncing: () => setSyncingAction(null),
  };
}

/**
 * SyncErrorWatcher — auto-clears the error after 4s.
 * Mount once at a high level (e.g. layout or ShopHeader).
 */
export default function SyncErrorWatcher() {
  const { syncError, dismissError } = useSyncStatus();
  useEffect(() => {
    if (!syncError) return;
    const t = setTimeout(() => dismissError(), 4000);
    return () => clearTimeout(t);
  }, [syncError, dismissError]);
  return null;
}
