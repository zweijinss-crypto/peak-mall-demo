'use client';

import type { FC } from 'react';
import type { ServiceItem } from './types';
import { useT } from '@/lib/use-t';

export interface ServiceStripProps {
  items?: ServiceItem[];
}

function buildDefaults(cp: ReturnType<typeof useT>): ServiceItem[] {
  const s = cp.service as Record<string, { title: string; desc: string }>;
  return [
    { icon: '🚚', title: s.shipping.title, desc: s.shipping.desc },
    { icon: '↩️', title: s.return.title, desc: s.return.desc },
    { icon: '💬', title: s.support.title, desc: s.support.desc },
    { icon: '✅', title: s.authentic.title, desc: s.authentic.desc },
  ];
}

/**
 * ServiceStrip - 服务保障条 (参考源站 .svcs .it)
 */
const ServiceStrip: FC<ServiceStripProps> = ({ items }) => {
  const cp = useT();
  const resolved = items ?? buildDefaults(cp);
  return (
    <section className="bg-white border-t border-neutral-100 mt-16">
      <div className="max-w-[1280px] mx-auto px-5 py-7 grid grid-cols-2 md:grid-cols-4 gap-5">
        {resolved.map((it, i) => (
          <div key={i} className="flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
            <div className="w-[50px] h-[50px] rounded-[14px] bg-orange-100 text-orange-500 flex items-center justify-center text-[22px] flex-shrink-0">
              {it.icon}
            </div>
            <div>
              <b className="block text-[14.5px] font-bold text-neutral-900 mb-0.5">
                {it.title}
              </b>
              <span className="text-[12.5px] text-neutral-700 leading-[1.5]">
                {it.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceStrip;
