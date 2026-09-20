import type { FC } from 'react';
import Link from 'next/link';
import type {
  BrandInfo,
  ContactInfo,
  FooterColumn,
} from './types';
import { useT } from '@/lib/use-t';

export interface FooterProps {
  brand?: BrandInfo;
  columns?: FooterColumn[];
  contact?: ContactInfo;
  payLogos?: string[];
  year?: number;
}

const Footer: FC<FooterProps> = ({
  brand,
  columns,
  contact,
  payLogos = ['VISA', 'MasterCard'],
  year = 2026,
}) => {
  const t = useT();

  const DEFAULT_BRAND: BrandInfo = {
    name: t.brand.name,
    slogan: t.brand.slogan,
    intro: t.brand.intro ?? '',
  };

  const DEFAULT_COLUMNS: FooterColumn[] = [
    {
      title: t.footer.col1,
      links: [
        { label: t.footer.all, href: '/shop-all' },
        { label: t.footer.new, href: '/shop-new' },
        { label: t.footer.hot, href: '/shop-hot' },
        { label: t.footer.about, href: '/about' },
      ],
    },
    {
      title: t.footer.col2,
      links: [
        { label: t.footer.account, href: '/profile' },
        { label: t.footer.orders, href: '/orders' },
        { label: t.footer.wishlist, href: '/wishlist' },
        { label: t.footer.address, href: '/address' },
      ],
    },
    {
      title: t.footer.col3,
      links: [
        { label: t.footer.aftersales, href: '/aftersale' },
        { label: t.footer.shipping, href: '/about#shipping' },
        // /terms /privacy 暂未建站 → 占位 # 避免 404
        { label: t.footer.terms, href: '#' },
        { label: t.footer.privacy, href: '#' },
      ],
    },
  ];

  const DEFAULT_CONTACT: ContactInfo = {
    telegram: '@YourSupport',
    hours: '13:00 - 23:30',
    email: 'support@peakmall.com',
  };

  const finalBrand = brand ?? DEFAULT_BRAND;
  const finalColumns = columns ?? DEFAULT_COLUMNS;
  const finalContact = contact ?? DEFAULT_CONTACT;
  const intro = brand?.intro ?? t.brand.intro ?? '';

  return (
    <footer className="bg-neutral-900 text-neutral-400 pt-12 min-h-[320px]">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 md:gap-9 pb-9">
          <div>
            <h2 className="sr-only">{finalBrand.name}</h2>
            <h3 className="text-white text-[15px] font-bold mb-5 tracking-[-0.01em] relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
              {finalBrand.name}
            </h3>
            <p className="text-[13px] leading-[1.9] mb-4">{intro}</p>
            <div className="flex gap-2.5">
              {['f', 'X', 'in', 'IG'].map((s) => (
                <span
                  key={s}
                  aria-label={`社交媒体 ${s} (未配置链接)`}
                  className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center text-[13px] opacity-60"
                  title="社交媒体链接未配置"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {finalColumns.map((col, i) => (
            <div key={i}>
              <h3 className="text-white text-[15px] font-bold mb-5 tracking-[-0.01em] relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l, j) => {
                  const href = l.href ?? '#';
                  const isPlaceholder = href === '#';
                  return (
                    <li key={j}>
                      {href && !isPlaceholder ? (
                        <Link href={href} className="text-[13px] cursor-pointer hover:text-orange-500" onClick={l.onClick}>
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          className="text-[13px] cursor-pointer hover:text-orange-500 opacity-60"
                          onClick={l.onClick}
                          aria-disabled="true"
                          title="页面未建 (placeholder)"
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-white text-[15px] font-bold mb-5 tracking-[-0.01em] relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
              {t.footer.col4}
            </h3>
            <ul className="space-y-2.5">
              <li><a className="text-[13px] hover:text-orange-500 cursor-pointer">{finalContact.telegram}</a></li>
              <li>{t.footer.hours(finalContact.hours)}</li>
              <li>{finalContact.email}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-4 flex justify-between items-center text-[12.5px] flex-wrap gap-3">
          <div>© {year} {finalBrand.name} · {finalBrand.slogan}　{t.footer.rights}</div>
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
