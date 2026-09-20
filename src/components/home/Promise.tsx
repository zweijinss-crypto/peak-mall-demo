'use client';

import type { FC } from 'react';
import { useT } from '@/lib/use-t';

/**
 * Promise - 服务保障:深色背景 + 4 列服务卡,克制版(去掉 grid + glow + 渐变)
 */
const Promise: FC = () => {
  const cp = useT();
  const items = [
    { icon: '🚚', title: cp.service.shipping.title, desc: cp.service.shipping.desc },
    { icon: '↩️', title: cp.service.return.title, desc: cp.service.return.desc },
    { icon: '💬', title: cp.service.support.title, desc: cp.service.support.desc },
    { icon: '✅', title: cp.service.authentic.title, desc: cp.service.authentic.desc },
  ];

  return (
    <section className="bg-ink-900 text-white py-12 relative">
      <div className="relative max-w-shell mx-auto px-5">
        <div className="text-center mb-10">
          <div className="text-[12px] font-semibold tracking-[3px] uppercase text-white/60 mb-2">{cp.promise.label}</div>
          <h2 className="text-[28px] md:text-[32px] font-bold leading-tight">{cp.promise.title}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <div key={i} className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-[28px] mb-4">
                {it.icon}
              </div>
              <div className="text-[15px] font-bold mb-1.5">{it.title}</div>
              <div className="text-[12.5px] text-white/70 leading-relaxed">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Promise;
