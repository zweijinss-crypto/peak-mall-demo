import type { FC } from 'react';
import type {
  BrandInfo,
  ContactInfo,
  FooterColumn,
} from './types';
import { COPY } from '@/lib/copy';

export interface FooterProps {
  brand?: BrandInfo;
  columns?: FooterColumn[];
  contact?: ContactInfo;
  payLogos?: string[];
  year?: number;
}

const DEFAULT_BRAND: BrandInfo = {
  name: COPY.brand.name,
  slogan: COPY.brand.slogan,
  intro: COPY.brand.intro,
};

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: COPY.footer.col1,
    links: [
      { label: COPY.footer.all },
      { label: COPY.footer.new },
      { label: COPY.footer.hot },
      { label: COPY.footer.about },
    ],
  },
  {
    title: COPY.footer.col2,
    links: [
      { label: '个人中心' },
      { label: COPY.footer.orders },
      { label: COPY.footer.wishlist },
      { label: COPY.footer.address },
    ],
  },
  {
    title: COPY.footer.col3,
    links: [
      { label: COPY.footer.aftersales },
      { label: COPY.footer.shipping },
      { label: COPY.footer.terms },
      { label: COPY.footer.privacy },
    ],
  },
];

const DEFAULT_CONTACT: ContactInfo = {
  telegram: '@YourSupport',
  hours: '13:00 - 23:30',
  email: 'support@peakmall.com',
};

/**
 * Footer - 商城页脚 (参考源站 .foot)
 */
const Footer: FC<FooterProps> = ({
  brand = DEFAULT_BRAND,
  columns = DEFAULT_COLUMNS,
  contact = DEFAULT_CONTACT,
  payLogos = ['VISA', 'MasterCard'],
  year = 2026,
}) => {
  return (
    <footer className="bg-neutral-900 text-neutral-400 pt-12">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 md:gap-9 pb-9">
          <div>
            <h3 className="text-white text-[14.5px] font-bold mb-4 relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
              {brand.name}
            </h3>
            <p className="text-[13px] leading-[1.9] mb-4">{brand.intro}</p>
            <div className="flex gap-2.5">
              {['f', 'X', 'in', 'IG'].map((s) => (
                <a key={s} className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center text-[13px] hover:bg-orange-500 hover:text-white cursor-pointer">
                  {s}
                </a>
              ))}
            </div>
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h3 className="text-white text-[14.5px] font-bold mb-4 relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a className="text-[13px] cursor-pointer hover:text-orange-500" onClick={l.onClick}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-white text-[14.5px] font-bold mb-4 relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
              {COPY.footer.col4}
            </h3>
            <ul className="space-y-2.5">
              <li><a className="text-[13px] hover:text-orange-500 cursor-pointer">{contact.telegram}</a></li>
              <li>服务时间: {contact.hours}</li>
              <li>{contact.email}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-4 flex justify-between items-center text-[12.5px] flex-wrap gap-3">
          <div>© {year} {brand.name} · {brand.slogan}　保留所有权利</div>
          <div className="flex gap-2 items-center">
            {payLogos.map((p, i) => (
              <span
                key={i}
                className="h-[26px] px-2.5 rounded bg-white/95 text-[10.5px] font-extrabold flex items-center tracking-wide"
                style={{ color: i === 1 ? '#b91c1c' : '#1a1f71' }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
