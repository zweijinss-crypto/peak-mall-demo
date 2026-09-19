'use client';

import { useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  type CurrencyCode,
} from '@/components/peak-mall';
import { PRODUCTS, CATEGORIES } from '@/data/products';
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

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'all', label: '全部' },
  { key: 'new', label: '新品' },
  { key: 'hot', label: '热卖' },
  { key: 'orders', label: '我的订单' },
  { key: 'after', label: '售后' },
  { key: 'about', label: '关于' },
];

const CURRENCY_OPTIONS = [
  { code: 'USD' as CurrencyCode, label: 'USD 美元' },
  { code: 'CNY' as CurrencyCode, label: 'CNY 人民币' },
  { code: 'EUR' as CurrencyCode, label: 'EUR 欧元' },
  { code: 'GBP' as CurrencyCode, label: 'GBP 英镑' },
  { code: 'JPY' as CurrencyCode, label: 'JPY 日元' },
  { code: 'KRW' as CurrencyCode, label: 'KRW 韩元' },
  { code: 'AUD' as CurrencyCode, label: 'AUD 澳元' },
  { code: 'CAD' as CurrencyCode, label: 'CAD 加元' },
];

const LANG_OPTIONS = [
  { code: 'zh' as const, label: '中文' },
  { code: 'en' as const, label: 'EN' },
];

const FOOTER_COLUMNS = [
  {
    title: '购物',
    links: [
      { label: '全部商品' },
      { label: '新品上架' },
      { label: '热卖榜单' },
      { label: '关于我们' },
    ],
  },
  {
    title: '账户',
    links: [
      { label: '个人中心' },
      { label: '我的订单' },
      { label: '我的收藏' },
      { label: '收货地址' },
    ],
  },
  {
    title: '帮助',
    links: [
      { label: '售后服务' },
      { label: '配送说明' },
      { label: '使用条款' },
      { label: '隐私政策' },
    ],
  },
];

export default function HomePage() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  return (
    <>
      <AnnouncementBar tag="公告" text="新用户首单立享 8 折优惠 · 全场满 $50 包邮" duration={20} />
      <ShopHeader
        brand={{ name: '顶峰商城', slogan: 'PEAK MALL' }}
        navItems={NAV_ITEMS}
        active="home"
        currencyOptions={CURRENCY_OPTIONS}
        currency={currency}
        onCurrencyChange={(c) => setCurrency(c as CurrencyCode)}
        langOptions={LANG_OPTIONS}
        lang={lang}
        onLangChange={setLang}
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
        <Recommended products={PRODUCTS} categories={CATEGORIES} currency={currency} />

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
        brand={{
          name: '顶峰商城',
          slogan: 'PEAK MALL',
          intro: '全球优选 · 正品保障。28 国配送,7 天无理由退换。',
        }}
        columns={FOOTER_COLUMNS}
        contact={{
          telegram: '@YourSupport',
          hours: '13:00 - 23:30',
          email: 'support@peakmall.com',
        }}
        payLogos={['VISA', 'MasterCard']}
      />
    </>
  );
}
