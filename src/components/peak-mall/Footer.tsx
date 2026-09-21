import type { FC } from 'react';
import Link from 'next/link';
import type {
  BrandInfo,
  ContactInfo,
  FooterColumn,
} from './types';
import { COPY } from '@/lib/copy';
import { COPY_EN } from '@/lib/copy.en';

export interface FooterProps {
  brand?: BrandInfo;
  columns?: FooterColumn[];
  contact?: ContactInfo;
  payLogos?: string[];
  year?: number;
  /** Locale override. If omitted we infer from `headers()` via cookies later.
   *  For now, callers pass locale explicitly (zh|en). */
  locale?: 'zh' | 'en';
}

/**
 * Footer — server-renderable. Reads copy directly from COPY/COPY_EN
 * instead of going through useT() (which is a hook that makes the entire
 * tree a client component). This fixes CLS 0.34 on /shop-* pages where
 * the footer was rendering as an empty SSR placeholder and then filling
 * in post-hydration, causing a 0.357 layout shift.
 */
const Footer: FC<FooterProps> = ({
  brand,
  columns,
  contact,
  payLogos = ['VISA', 'MasterCard'],
  year = 2026,
  locale = 'zh',
}) => {
  const cp = locale === 'en' ? COPY_EN : COPY;

  const DEFAULT_BRAND: BrandInfo = {
    name: cp.brand.name,
    slogan: cp.brand.slogan,
    intro: cp.brand.intro ?? '',
  };

  const DEFAULT_COLUMNS: FooterColumn[] = [
    {
      title: cp.footer.col1,
      links: [
        { label: cp.footer.all, href: '/shop-all' },
        { label: cp.footer.new, href: '/shop-new' },
        { label: cp.footer.hot, href: '/shop-hot' },
        { label: cp.footer.about, href: '/about' },
      ],
    },
    {
      title: cp.footer.col2,
      links: [
        { label: cp.footer.account, href: '/profile' },
        { label: cp.footer.orders, href: '/orders' },
        { label: cp.footer.wishlist, href: '/wishlist' },
        { label: cp.footer.address, href: '/address' },
      ],
    },
    {
      title: cp.footer.col3,
      links: [
        { label: cp.footer.aftersales, href: '/aftersale' },
        { label: cp.footer.shipping, href: '/about#shipping' },
        { label: cp.footer.terms, href: '/terms' },
        { label: cp.footer.privacy, href: '/privacy' },
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
  const intro = brand?.intro ?? cp.brand.intro ?? '';

  return (
    <footer className="bg-neutral-900 text-neutral-400 pt-12 pb-6">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 md:gap-9 pb-9">
          <div>
            <h2 className="sr-only">{finalBrand.name}</h2>
            <h3 className="text-white text-[15px] font-bold mb-5 tracking-[-0.01em] relative after:content-[''] after:block after:w-6 after:h-0.75 after:bg-orange-500 after:rounded-sm after:mt-2.5">
              {finalBrand.name}
            </h3>
            <p className="text-[12.5px] text-neutral-400 leading-relaxed mb-5">
              {intro}
            </p>
            <div className="flex gap-2.5">
              <a href="#" aria-label="f — Facebook" className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-orange-500 text-white text-[13px] flex items-center justify-center transition-colors">f</a>
              <a href="#" aria-label="X — 社交媒体" className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-orange-500 text-white text-[13px] flex items-center justify-center transition-colors">X</a>
              <a href="#" aria-label="in — LinkedIn" className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-orange-500 text-white text-[13px] flex items-center justify-center transition-colors">in</a>
              <a href="#" aria-label="IG — Instagram" className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-orange-500 text-white text-[13px] flex items-center justify-center transition-colors">IG</a>
            </div>
          </div>
          {finalColumns.map((col, idx) => (
            <div key={idx}>
              <h3 className="text-white text-[13px] font-bold mb-4 tracking-[0.02em]">{col.title}</h3>
              <ul className="space-y-2.5 text-[12.5px]">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <Link href={l.href as any} className="hover:text-orange-400 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-white text-[13px] font-bold mb-4 tracking-[0.02em]">{cp.footer.col4}</h3>
            <ul className="space-y-2 text-[12.5px]">
              <li><span className="text-neutral-400">Telegram:</span> {finalContact.telegram}</li>
              <li><span className="text-neutral-400">{cp.footer.hours(finalContact.hours)}</span></li>
              <li><span className="text-neutral-400">Email:</span> {finalContact.email}</li>
            </ul>
            <div className="mt-5 flex gap-2">
              {payLogos.map((p, i) => (
                <span key={i} className="px-2 py-1 bg-neutral-800 rounded text-[10px] font-bold tracking-wider text-neutral-400">{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-800 pt-5 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-neutral-400">
          <span>© {year} {finalBrand.name}. {cp.footer.rights}</span>
          <span className="flex gap-4">
            <Link href="/terms" className="hover:text-orange-400 transition-colors">{cp.footer.terms}</Link>
            <Link href="/privacy" className="hover:text-orange-400 transition-colors">{cp.footer.privacy}</Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;