/**
 * seed-products — seed the 16 demo products from src/data/products.ts
 * into Supabase `products` table.
 *
 * Usage:
 *   pnpm tsx supabase/seed/seed-products.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (NOT anon; needs to bypass RLS for writes)
 *
 * Idempotent: re-running upserts by id.
 */

import { createClient } from '@supabase/supabase-js';
import { PRODUCTS } from '../../src/data/products';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '[seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY\n' +
      'Set them in .env.local before running.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

interface ProductRow {
  id: number;
  name: { zh: string; en: string };
  category: { zh: string; en: string };
  description: { zh: string; en: string };
  highlights: Array<{ zh: string; en: string }>;
  long_description: Array<{ zh: string; en: string }>;
  price: number;
  stock: number;
  cover: string;
  status: number;
}

const rows: ProductRow[] = PRODUCTS.map((p) => ({
  id: p.id,
  name: { zh: p.name, en: p.name },
  category: { zh: p.category, en: p.category },
  description: { zh: p.description ?? '', en: p.description ?? '' },
  highlights: (p.highlights ?? []).map((h) => ({ zh: h.zh, en: h.en ?? h.zh })),
  long_description: (p.longDescription ?? []).map((h) => ({
    zh: h.zh,
    en: h.en ?? h.zh,
  })),
  price: Number(p.price),
  stock: p.stock,
  cover: p.cover,
  status: p.status ?? 1,
}));

async function main() {
  console.log(`[seed] upserting ${rows.length} products…`);

  // Upsert in batches of 10 to stay well under Supabase's row limits
  const batchSize = 10;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`[seed] batch ${i}-${i + batch.length} failed:`, error);
      process.exit(1);
    }
    console.log(`[seed] batch ${i}-${i + batch.length} OK`);
  }

  console.log('[seed] done');
}

main().catch((err) => {
  console.error('[seed] unexpected:', err);
  process.exit(1);
});
