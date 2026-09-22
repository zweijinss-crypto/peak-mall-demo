'use client';

import { useEffect, useState } from 'react';
import { isFlagOn } from '@/lib/ab/posthog';

/**
 * CheckoutABTestBanner — example Phase 3.5.1 consumer.
 *
 * Demonstrates how to plug the PostHog flag helper into any client
 * surface. When the `checkout-v2` flag is on (or PostHog isn't
 * configured and the dev rolloutPercent applies), the banner shows
 * up at the top of /checkout explaining the new flow.
 *
 * Drop this into the checkout page header when you actually flip the
 * flag; it's left un-mounted for now so the live checkout flow stays
 * untouched.
 */
export function CheckoutABTestBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    void (async () => {
      const v = await isFlagOn('checkout-v2', { rolloutPercent: 0 });
      setShow(v === true || v === 'true');
    })();
  }, []);
  if (!show) return null;
  return (
    <div className="bg-orange-50 border-b border-orange-200 px-5 py-2 text-[12.5px] text-orange-900 text-center">
      🚧 收银台 v2 测试中 — 你看到的是新流程。
    </div>
  );
}
