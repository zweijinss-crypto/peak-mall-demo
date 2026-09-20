'use client';

import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { PRODUCTS, CATEGORIES } from '@/data/products';
import { usePeakStore } from '@/lib/store';
import { usePageChrome } from '@/lib/page-nav';
import Hero from '@/components/home/Hero';
import TrustStrip from '@/components/home/TrustStrip';
import FlashSale from '@/components/home/FlashSale';
import CategoryGrid from '@/components/home/CategoryGrid';
import TopSelling from '@/components/home/TopSelling';
import Recommended from '@/components/home/Recommended';
import Quality from '@/components/home/Quality';
import NewArrivals from '@/components/home/NewArrivals';
import Testimonials from '@/components/home/Testimonials';
import Promise from '@/components/home/Promise';
import NewsletterCTA from '@/components/home/NewsletterCTA';

const FOOTER_PAY = ['VISA', 'MasterCard'];
const FOOTER_CONTACT = {
  telegram: '@YourSupport',
  hours: '13:00 - 23:30',
  email: 'support@peakmall.com',
};

export default function HomePage() {
  const chrome = usePageChrome('home', 'home');

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} duration={20} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active="home"
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main>
        {/* 1. Hero — 新版 */}
        <Hero />

        {/* 2. 信任数据条 */}
        <TrustStrip />

        {/* 3. 限时秒杀 */}
        <FlashSale products={PRODUCTS} />

        {/* 4. 热门分类 */}
        <CategoryGrid />

        {/* 5. 热销榜 TOP 5 */}
        <TopSelling products={PRODUCTS} />

        {/* 6. 推荐商品 + 排序 */}
        <Recommended products={PRODUCTS} categories={CATEGORIES} currency={chrome.currency} />

        {/* 7. 品质专区(双 banner 重做) */}
        <Quality />

        {/* 8. 新品上市 */}
        <NewArrivals products={PRODUCTS} />

        {/* 9. 用户评价 */}
        <Testimonials />

        {/* 10. 服务保障 */}
        <Promise />

        {/* 11. CTA 邮件订阅 */}
        <NewsletterCTA />
      </main>

      <Footer
        contact={FOOTER_CONTACT}
        payLogos={FOOTER_PAY}
      />
    </>
  );
}
