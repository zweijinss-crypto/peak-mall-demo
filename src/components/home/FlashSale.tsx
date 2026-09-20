'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { FC } from 'react';
import type { Product } from '@/components/peak-mall/types';
import { useT } from '@/lib/use-t';

export interface FlashSaleProps {
  products: Product[];
}

function diff(target: number) {
  const ms = target - Date.now();
  if (ms <= 0) return { h: 0, m: 0, s: 0 };
  return {
    h: Math.floor(ms / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
  };
}

/**
 * FlashSale - 限时秒杀:倒计时 + 横向滚动 4 件商品
 * 12 小时倒计时,组件挂载时锁定结束时间
 */
const FlashSale: FC<FlashSaleProps> = ({ products }) => {
  const router = useRouter();
  const cp = useT();
  const items = products.slice(0, 4);
  // Hydration-safe: start with 0, compute target after mount
  const [end, setEnd] = useState<number>(0);
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = Date.now() + 12 * 3_600_000;
    setEnd(target);
    setT(diff(target));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setT(diff(end)), 1000);
    return () => clearInterval(id);
  }, [end]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="relative bg-white py-12">
      <div className="relative max-w-shell mx-auto px-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px] font-semibold tracking-[3px] uppercase text-rose-700">⚡ {cp.flashSale.label}</span>
              <span className="text-[12px] text-ink-500">{cp.flashSale.scope}</span>
            </div>
            <h2 className="text-[28px] md:text-[32px] font-bold text-ink-900 leading-tight">
              {cp.flashSale.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-500 font-semibold">{cp.flashSale.endsIn}</span>
            <div className="flex items-center gap-1">
              {[pad(t.h), pad(t.m), pad(t.s)].map((v, i) => (
                <span key={i} className="flex items-center">
                  <span className="bg-ink-900 text-white text-[18px] font-bold font-mono px-2.5 py-1 rounded">{v}</span>
                  {i < 2 && <span className="text-ink-900 font-bold mx-0.5">:</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((p, i) => {
            const salePrice = (Number(p.price) * 0.6).toFixed(2);
            const savings = (Number(p.price) * 0.4).toFixed(0);
            const stock = Math.max(1, Math.floor(Number(p.stock) * 0.15));
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/shop/${p.id}`)}
                className="group bg-white rounded-xl overflow-hidden text-left border border-ink-100 hover:border-ink-300 transition-colors"
              >
                <div className="relative aspect-square bg-ink-100">
                  {p.cover?.startsWith('/') || p.cover?.startsWith('http') ? (
                    <Image src={p.cover} alt={p.name} width={400} height={400} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[64px]">📦</div>
                  )}
                  <div className="absolute top-2 left-2 bg-accent-rose text-white text-[11px] font-extrabold px-2 py-0.5 rounded">
                    -{40 + i * 5}%
                  </div>
                  <div className="absolute bottom-2 right-2 bg-ink-900/85 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
                    {cp.flashSale.stock}: {stock}
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="text-[12.5px] font-semibold text-ink-900 line-clamp-2 leading-snug mb-2 min-h-[34px]">{p.name}</div>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-rose-700 text-[20px] font-extrabold">${salePrice}</span>
                    <span className="text-ink-600 text-[12px] line-through">${p.price}</span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-semibold">{cp.flashSale.save} ${savings}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlashSale;
