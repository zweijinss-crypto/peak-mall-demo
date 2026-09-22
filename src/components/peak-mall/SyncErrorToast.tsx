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
      addToCart: t.sync?.addToCart ?? '加入购物车失败,已恢复原状态',
      updateQty: t.sync?.updateQty ?? '更新数量失败,已恢复原状态',
      removeFromCart: t.sync?.removeFromCart ?? '删除商品失败,已恢复原状态',
      clearCart: t.sync?.clearCart ?? '清空购物车失败,已恢复原状态',
      toggleSelect: t.sync?.toggleSelect ?? '选择状态同步失败',
      setAllSelected: t.sync?.setAllSelected ?? '全选状态同步失败',
      toggleWish: t.sync?.toggleWish ?? '收藏状态同步失败',
      cancelOrder: t.sync?.cancelOrder ?? '取消订单失败,已恢复原状态',
      placeOrder: t.sync?.placeOrder ?? '订单同步到服务器失败,请稍后重试',
    } as Record<string, string>)[syncError] ?? `同步失败: ${syncError}`
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
