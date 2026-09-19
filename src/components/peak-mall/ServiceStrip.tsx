import type { FC } from 'react';
import type { ServiceItem } from './types';
import { COPY } from '@/lib/copy';

export interface ServiceStripProps {
  items?: ServiceItem[];
}

const DEFAULT_ITEMS: ServiceItem[] = [
  { icon: '🚚', title: COPY.service.shipping.title, desc: COPY.service.shipping.desc },
  { icon: '↩️', title: COPY.service.return.title, desc: COPY.service.return.desc },
  { icon: '💬', title: COPY.service.support.title, desc: COPY.service.support.desc },
  { icon: '✅', title: COPY.service.authentic.title, desc: COPY.service.authentic.desc },
];

/**
 * ServiceStrip - 服务保障条 (参考源站 .svcs .it)
 */
const ServiceStrip: FC<ServiceStripProps> = ({ items = DEFAULT_ITEMS }) => {
  return (
    <section className="bg-white border-t border-neutral-100 mt-16">
      <div className="max-w-[1280px] mx-auto px-5 py-7 grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((it, i) => (
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
