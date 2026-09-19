import type { FC } from 'react';
import { COPY } from '@/lib/copy';

/**
 * Promise - 服务保障:重做 ServiceStrip 用深色背景 + 大图标 + 4 列网格
 */
const Promise: FC = () => {
  const items = [
    { icon: '🚚', title: COPY.service.shipping.title, desc: COPY.service.shipping.desc, color: 'from-blue-500 to-indigo-600' },
    { icon: '↩️', title: COPY.service.return.title, desc: COPY.service.return.desc, color: 'from-rose-500 to-pink-600' },
    { icon: '💬', title: COPY.service.support.title, desc: COPY.service.support.desc, color: 'from-emerald-500 to-teal-600' },
    { icon: '✅', title: COPY.service.authentic.title, desc: COPY.service.authentic.desc, color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <section className="bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="relative max-w-shell mx-auto px-5">
        <div className="text-center mb-10">
          <div className="text-[12px] font-extrabold tracking-[3px] uppercase text-white/60 mb-2">{COPY.promise.label}</div>
          <h2 className="text-[28px] md:text-[32px] font-extrabold leading-tight">{COPY.promise.title}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <div key={i} className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all hover:-translate-y-1">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${it.color} flex items-center justify-center text-[28px] mb-4 shadow-glow`}>
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
