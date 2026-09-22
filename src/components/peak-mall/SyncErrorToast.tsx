'use client';

import { useEffect } from 'react';
import { useSyncStatus } from '@/lib/api/sync-status';
import { useT } from '@/lib/use-t';

/**
 * SyncErrorWatcher — auto-clears the error after 4s.
 * Mount once at a high level (e.g. layout or ShopHeader).
 */
export function SyncErrorWatcher() {
  const { syncError, dismissError } = useSyncStatus();
  useEffect(() => {
    if (!syncError) return;
    const t = setTimeout(() => dismissError(), 4000);
    return () => clearTimeout(t);
  }, [syncError, dismissError]);
  return null;
}

/**
 * SyncErrorToast — small bottom-right toast that surfaces sync failures.
 *
 * Mounted once at the layout level. Reads syncError from the store and
 * shows a translated message; auto-dismisses after 4s.
 */
export default function SyncErrorToast() {
  const { syncError } = useSyncStatus();
  const t = useT();
  if (!syncError) return null;

  // Map action key → human message
  const msg = (
    ({
      addToCart: t.sync?.addToCart ?? 'Add to cart failed — reverted',
      updateQty: t.sync?.updateQty ?? 'Update quantity failed — reverted',
      removeFromCart: t.sync?.removeFromCart ?? 'Remove from cart failed — reverted',
      clearCart: t.sync?.clearCart ?? 'Clear cart failed — reverted',
      toggleSelect: t.sync?.toggleSelect ?? 'Select sync failed',
      setAllSelected: t.sync?.setAllSelected ?? 'Select-all sync failed',
      toggleWish: t.sync?.toggleWish ?? 'Wishlist sync failed',
      cancelOrder: t.sync?.cancelOrder ?? 'Cancel order failed — reverted',
      placeOrder: t.sync?.placeOrder ?? 'Order sync to server failed. Please retry.',
    } as Record<string, string>)[syncError] ?? `Sync failed: ${syncError}`
  );

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-[320px] rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800 shadow-md"
    >
      <div className="font-bold mb-0.5">{t.sync?.title ?? '同步失败'}</div>
      <div>{msg}</div>
    </div>
  );
}
