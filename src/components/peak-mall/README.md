# components-ts — peak-mall 组件 (TypeScript)

> 10 个 React + Tailwind 组件,从源站逆向,**纯 UI,无业务逻辑**。
> 所有文案用 `{{COPY:xxx}}` 占位 — 你必须自己写,不能直接用源站字。
> 业务逻辑全部 TODO 留白 — 你接自己的后端。

## 目录结构

```
components-ts/
├── types.ts                  # 共用类型
├── index.ts                  # barrel export
├── AnnouncementBar.tsx       公告条
├── AuthSplit.tsx             登录注册双栏
├── CategoryBar.tsx           分类胶囊
├── DoubleBanner.tsx          双列 banner
├── Footer.tsx                页脚
├── HeroCarousel.tsx          Hero 轮播
├── ProductCard.tsx           商品卡
├── ProductModal.tsx          商品详情弹窗
├── ServiceStrip.tsx          服务保障条
└── ShopHeader.tsx            商城头部
```

## 怎么 import

```ts
import {
  HeroCarousel,
  ProductCard,
  CategoryBar,
  ShopHeader,
  Footer,
  ServiceStrip,
  AnnouncementBar,
  DoubleBanner,
  AuthSplit,
  ProductModal,
  type Product,
  type CurrencyCode,
} from '@/components/peak-mall';
```

## 用法示例

### 首页拼装

```tsx
'use client';

import { useState } from 'react';
import {
  HeroCarousel, AnnouncementBar, ShopHeader, CategoryBar,
  ProductCard, ProductModal, DoubleBanner, ServiceStrip, Footer,
  type Product,
} from '@/components/peak-mall';

export default function HomePage() {
  const [active, setActive] = useState('全部');
  const [selected, setSelected] = useState<Product | null>(null);
  const products: Product[] = [...]; // 你的数据

  const filtered = active === '全部'
    ? products
    : products.filter(p => p.category === active);

  return (
    <>
      <AnnouncementBar tag="公告" text="新用户首单 8 折优惠" duration={20} />
      <ShopHeader active="home" />
      <HeroCarousel autoplayMs={5000} />
      <CategoryBar
        categories={['全部', '数码电子', '家用电器']}
        active={active}
        onChange={setActive}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-[1280px] mx-auto px-5">
        {filtered.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            currency="USD"
            onClick={setSelected}
          />
        ))}
      </div>
      <DoubleBanner />
      <ServiceStrip />
      <Footer />
      <ProductModal
        product={selected}
        currency="USD"
        onClose={() => setSelected(null)}
      />
    </>
  );
}
```

### 登录/注册页

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { AuthSplit } from '@/components/peak-mall';

export default function AuthPage() {
  const router = useRouter();

  return (
    <AuthSplit
      requireInvite={false}  // 业务建议:邀请码可选,不当门槛
      onLogin={async ({ email, password, remember }) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password, remember }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error };
        router.push('/shop');
        return { ok: true };
      }}
      onRegister={async (payload) => {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error };
        return { ok: true };
      }}
    />
  );
}
```

## Tailwind 配置

**对齐源站响应式断点**(来自 `frontend-css-breakpoints.json`):

```ts
// tailwind.config.ts
screens: {
  xs: '520px',   // 手机
  sm: '780px',   // 大手机/小平板
  md: '860px',   // 平板 (主切汉堡菜单)
  lg: '1100px',  // 小桌面
  xl: '1280px',  // 主内容 max-width
}
```

**对齐设计 token**(来自 `analysis/design-tokens.js`):

```ts
colors: {
  primary:    '#fd560f',
  primaryDark:'#dc4a0c',
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    500: '#6b7280',
    900: '#111827',
  },
},
fontSize: {
  // 源站主用 11-14px
  '2xs': ['11px', '1.4'],
  xs:    ['12px', '1.5'],
  sm:    ['13px', '1.55'],
  base:  ['14px', '1.6'],
},
borderRadius: {
  sm: '6px',   // 源站 8px 也常见
  md: '10px',
  lg: '14px',
  xl: '20px',
},
```

## Props 总览

| 组件 | Props |
|---|---|
| `AnnouncementBar` | `tag`, `text`, `duration` |
| `AuthSplit` | `onLogin`, `onRegister`, `requireInvite`, `i18n` |
| `CategoryBar` | `categories`, `active`, `onChange` |
| `DoubleBanner` | `items`, `onClick` |
| `Footer` | `brand`, `columns`, `contact`, `payLogos`, `year` |
| `HeroCarousel` | `autoplayMs`, `slides` |
| `ProductCard` | `product`, `onClick`, `currency` |
| `ProductModal` | `product`, `onClose`, `currency` |
| `ServiceStrip` | `items` |
| `ShopHeader` | `brand`, `navItems`, `active`, `currencyOptions`, `currency`, `onCurrencyChange`, `langOptions`, `lang`, `onLangChange` |

## 类型 (`types.ts`)

```ts
export type CurrencyCode = 'USD' | 'CNY' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'AUD' | 'CAD';
export type LangCode = 'zh' | 'en';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: string | number;
  stock: number;
  cover: string;
  description?: string;
  status?: number;
  created_at?: string;
}

export interface BrandInfo { name: string; slogan: string; intro?: string; }
export interface NavItem { key: string; label: string; top?: boolean; onClick?: () => void; }
export interface CurrencyOption { code: CurrencyCode; label: string; }
export interface LangOption { code: LangCode; label: string; }
export interface BannerItem { title: string; subtitle: string; cta: string; bg: string; }
export interface ServiceItem { icon: string; title: string; desc: string; }
export interface Slide { eyebrow: string; h1: string; p: string; cta: string; bg: string; }
export interface ContactInfo { telegram: string; hours: string; email: string; }
export interface FooterLink { label: string; onClick?: () => void; }
export interface FooterColumn { title: string; links: FooterLink[]; }
```

## ⚠️ 不要做的事

❌ 直接 import 这个目录 `cp -r` 然后发到生产环境
❌ 替换文案时用源站的字符串(`'登录'` `'密码'` 等) — 自己写
❌ 在组件内硬编业务逻辑(调 API / 写 localStorage)— 父组件传
❌ 抄 AuthSplit 的 `requireInvite=true` — 业务建议**不**做强制邀请码

## ✅ 应该做的事

✅ 替换所有 `{{COPY:xxx}}` 为你的真实文案(用 next-intl 管理)
✅ 用 `ShopHeader` 的 `currencyOptions` 接你的汇率 API(实时换算)
✅ 用 `AuthSplit` 的 `onLogin/onRegister` 接 `next-auth` 或自建 API
✅ 用 `ProductCard` 的 `onClick` 弹 `ProductModal` 或路由到 `/shop/[id]`
✅ 用 `ShopHeader` 的 `lang` + `langOptions` 接 `next-intl` locale
