# MIGRATION.md — 怎么把这个 4-section 包搬进你的项目

## 1. 概览

本包结构:
```
reference/peak-mall/
├── components/             # 8 个 React+Tailwind 组件(.jsx),占位符 __COPY_xxx__
├── components-ts/          # 5 个 TS 端口 + types.ts + barrel
├── analysis/               # 7 份(本目录)
├── legal/                  # 4 份律师占位
├── scripts/                # gen-covers.mjs
├── sources/html/home.html  # 公开 HTML 镜像(只读)
└── README.md
```

## 2. 接入你的 Next.js / React 项目

### 步骤 1: 安装依赖
```bash
# Tailwind CSS v4
pnpm add tailwindcss @tailwindcss/postcss postcss
```

### 步骤 2: 复制 design tokens
```css
/* app/globals.css 顶部 */
:root{
  --primary:#fd560f;
  --primary-d:#dc4a0c;
  --success:#16a34a;
  --danger:#e54545;
  --gray-50:#f8fafc;
  --gray-100:#f1f5f9;
  --gray-200:#e2e8f0;
  --gray-300:#cbd5e1;
  --gray-500:#64748b;
  --gray-700:#334155;
  --gray-900:#0f172a;
}

body {
  font-family: -apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
  font-size: 14px;
  color: var(--gray-900);
  background: var(--gray-100);
}
```

### 步骤 3: 复制组件
```bash
# 整目录拷贝
cp -r reference/peak-mall/components src/components/peak-mall
cp -r reference/peak-mall/components-ts src/components/peak-mall-ts

# 或者只拷贝你要的(挑文件)
cp reference/peak-mall/components/ProductCard.jsx src/components/
```

### 步骤 4: 接入 i18n
```bash
# 把所有 '__COPY_section.key__' 替换成 t('section.key')
# 用 sed 一把梭:
find src/components/peak-mall -type f \( -name '*.jsx' -o -name '*.tsx' \) \
  -exec sed -i '' "s/'__COPY_\([a-zA-Z0-9_.]*\)__'/{t('\1')}/g" {} \;

# 然后替换 i18n 变量来源:
#   Option A: react-i18next → import { useTranslation } from 'react-i18next'; const { t } = useTranslation();
#   Option B: next-intl → import { useTranslations } from 'next-intl'; const t = useTranslations('peak-mall');
#   Option C: 自建 hook → import { useT } from '@/lib/useT';
```

### 步骤 5: 接入数据
```ts
// src/lib/api.ts
import { ProductCard, CategoryBar } from '@/components/peak-mall';

export default function ShopPage() {
  const { data: cats } = useSWR('/api/categories', fetcher);
  const { data: prods } = useSWR('/api/products', fetcher);

  return (
    <>
      <CategoryBar cats={cats} active={selected} onPick={setSelected} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4">
        {prods?.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
      </div>
    </>
  );
}
```

### 步骤 6: 接入 API(后端)
后端实现参考 `analysis/db-schema.md` 的 8 张表 + `analysis/api-routes.md` 的 13 条公开路由。

最小 Next.js API Route 示例:
```ts
// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '全部';
  const keyword = searchParams.get('keyword') || '';

  const products = await db.product.findMany({
    where: {
      status: 'ACTIVE',
      ...(category !== '全部' && { category: { name: category } }),
      ...(keyword && { name: { contains: keyword } }),
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: products });
}
```

## 3. 集成进 peak-mall-demo 现有项目

现有 `/Users/bz/Projects/peak-mall-demo/` 已经有 pay-records 演示 + zustand + next-intl 基础设施。

```bash
cd /Users/bz/Projects/peak-mall-demo

# 1. 复制 components
cp -r reference/peak-mall/components src/components/peak-mall

# 2. 复制 design tokens 到 globals.css
cat reference/peak-mall/analysis/design-tokens.js | grep -A 30 'cssVars' | tail -25 >> src/app/globals.css

# 3. 创建路由(Next.js App Router)
mkdir -p src/app/\[locale\]/peak-mall/{shop,product/\[id\],cart,login}

# 4. 创建首页 src/app/[locale]/peak-mall/shop/page.tsx
#    复制 components 引用 + 接 next-intl

# 5. 接入 i18n:
#    peak-mall 的 38 个占位 key 加进 messages/zh.json, messages/en.json

# 6. 接入 pay-fixtures(已有 42 个种子订单)
#    用前 N 个 product 数据喂 ProductCard
```

## 4. 集成 demo 演示页(完整组装)

可以做个完整组装 demo 看效果:

```bash
mkdir -p src/app/\[locale\]/peak-mall-demo/page.tsx
```

```tsx
// src/app/[locale]/peak-mall-demo/page.tsx
import {
  AnnouncementBar, HeroBanner, CategoryBar, DoubleBanner,
  ProductCard, ProductModal, CartLine, AuthSplit,
} from '@/components/peak-mall';

const MOCK_PRODUCTS = [
  { id: 1, name: '示例商品 A', price: 199, currency: 'USD' as const, coverEmoji: '📦', stockStatus: 'in_stock' as const, subtitle: '官方直采 · 正品保障' },
  { id: 2, name: '示例商品 B', price: 99, currency: 'USD' as const, coverEmoji: '🎧', stockStatus: 'low' as const, subtitle: '限时折扣' },
  { id: 3, name: '示例商品 C', price: 49, currency: 'USD' as const, coverEmoji: '👕', stockStatus: 'out' as const, subtitle: '已售罄' },
];

export default function PeakMallDemo() {
  return (
    <main>
      <AnnouncementBar text="新用户注册即享专属礼遇 · 全场正品保障" />
      <HeroBanner
        title="全球精选 · 品质好物"
        subtitle="为每一次选择负责 · 官方直采 · 正品保障"
        ctaLabel="立即选购"
        onCta={() => alert('Shop')}
      />
      <section>
        <h2>推荐商品</h2>
        <CategoryBar
          cats={[{ name: '数码', count: 12 }, { name: '家电', count: 8 }]}
          active="数码"
          onPick={(n) => console.log(n)}
        />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4">
          {MOCK_PRODUCTS.map(p => <ProductCard key={p.id} product={p} onAddToCart={(x) => alert(`Add ${x.name}`)} />)}
        </div>
        <DoubleBanner />
      </section>
    </main>
  );
}
```

启动 dev:
```bash
pnpm dev
# 访问 http://localhost:3002/zh/peak-mall-demo
```

## 5. 不做什么(再次强调)

- ❌ 不实现邀请码 / 多级分销 / 佣金 / USDT 支付 / 资金密码 / 提现
- ❌ 不实现 admin/agent/fx 后台(原站 17 页)
- ❌ 不实现支付(Stripe / 微信 / 支付宝由你自己接)
- ❌ 不写持久化(wishlist / cart persist 留 `// TODO`)

## 6. 法务强制项

`legal/privacy-policy.md` `legal/terms.md` `legal/refund.md` 三份都有 "MUST NOT SHIP WITHOUT LAWYER" 警告。  
**未让律师过审前不要 ship**。