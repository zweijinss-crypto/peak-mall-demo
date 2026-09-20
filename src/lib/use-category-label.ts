'use client';

import { useT } from './use-t';

/**
 * useCategoryLabel — map a product category key (always stored as the zh
 * string, e.g. "数码电子" / "家用电器") to the locale-appropriate display
 * label.
 *
 * Why this exists: product data keeps its original zh category as the
 * canonical key (so filters, cart, and CSV exports stay stable across
 * locales). But UI rendering must show "Tech" on /en and "数码电子" on /.
 *
 * If we ever add a third category, update CATEGORY_LABELS in both
 * src/lib/copy.ts and src/lib/copy.en.ts under shop.catElectronics /
 * catAppliances — then add the case here.
 */
export function useCategoryLabel(category: string): string {
  const t = useT();
  // The category labels live under t.shop.shopAll (and shopNew / shopHot),
  // not at the top of t.shop. We walk all three so /shop-all, /shop-new,
  // and /shop-hot stay consistent if a third block ever moves things.
  const shop = (t as Record<string, any>).shop ?? {};
  const all = shop.shopAll ?? {};
  const neu = shop.shopNew ?? {};
  const hot = shop.shopHot ?? {};
  const elec = all.catElectronics ?? neu.catElectronics ?? hot.catElectronics;
  const appl = all.catAppliances ?? neu.catAppliances ?? hot.catAppliances;
  switch (category) {
    case '数码电子':
      return elec ?? category;
    case '家用电器':
      return appl ?? category;
    default:
      return category;
  }
}