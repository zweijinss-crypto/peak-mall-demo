# Peak Mall — Demo

> 参考 1:1 改写的电商演示站点,展示组件化、静态导出、可访问性、品牌化 404 与 cookie 同意的最佳实践。

## 概览

- **类型**: Next.js 15 + TypeScript + Tailwind v3 静态演示站
- **目标**: 展示一个完整的多页商城 demo(首页 + 详情 + 购物车 + 订单 + 收藏 + 登录 + 注册 + 404)
- **真实感**: 全本地假鉴权 + Zustand persist,**没有真实后端**
- **品牌**: 顶峰 / Peak Mall,主色 `#fd560f` (orange)
- **国际化**: zh-CN(预留 en 字段)

## 快速开始

```bash
pnpm install      # 已 lock
pnpm dev          # localhost:3000
pnpm build        # 生成 out/ 静态产物
pnpm serve        # serve out -p 5050 (本地预览生产产物)
```

## Lighthouse (2025-09-19)

```
Desktop preset (1440×900, CPU 1×, provided throttling):
  Performance     100  (LCP 0.5s, CLS 0)
  Accessibility   100
  Best Practices  100
  SEO             100

Mobile preset (412×823, CPU 4×, simulated):
  Performance      99  (LCP 2.1s, CLS 0, TBT 30ms)
  Accessibility   100
  Best Practices  100
  SEO             100
```

## 路由

| 路由 | 类型 | 说明 |
|---|---|---|
| `/` | Static | 首页(11 sections) |
| `/shop/[id]` | SSG(16 paths) | 商品详情,`generateStaticParams` 预渲染 |
| `/cart` | Static | 购物车(Zustand persist) |
| `/orders` | Static | 订单历史 |
| `/wishlist` | Static | 心愿单 |
| `/profile` | Static | 账户中心(假鉴权后) |
| `/login` · `/register` | Static | 假鉴权(client mock) |
| 任何不存在的路径 | Static | 自定义 404 |

## 目录结构

```
src/
├─ app/                    # Next App Router
│  ├─ layout.tsx           # 根布局 + CookieBanner
│  ├─ not-found.tsx        # 品牌化 404
│  ├─ page.tsx             # 首页 (11 sections)
│  ├─ shop/[id]/           # 详情页 (SSG)
│  ├─ cart/ orders/ wishlist/ profile/ login/ register/
│  └─ globals.css
├─ components/
│  ├─ peak-mall/           # 顶层 chrome (ShopHeader/Footer/CategoryBar/...)
│  │  └─ CookieBanner.tsx  # 一次性 localStorage 持久化同意条
│  └─ home/                # 首页 11 个 sections
├─ lib/
│  ├─ copy.ts              # 单一文案来源(中文)
│  ├─ store.ts             # Zustand + persist (cart/orders/wishlist)
│  └─ auth.ts              # 假鉴权
└─ public/covers/          # 16 个本地 SVG 占位封面
```

## 设计原则

1. **文案单一来源**:`src/lib/copy.ts` 集中所有 UI 文案,组件用 `COPY.xxx.xxx` 取值,杜绝硬编码。
2. **零 placeholder 泄漏**: 运行时无 `[COPY:xxx]` 等占位符,搜索/购物车/收藏显示真实数据。
3. **静态优先**: 所有页面 `output: 'export'` 预渲染,无 server runtime 依赖,纯 CDN 可部署。
4. **可访问性优先**: a11y 100 (WCAG AA 4.5:1 对比度,heading-order 严格,h1 → h2 → h3,所有交互可键盘)。
5. **Hydration-safe**: 任何 `Date.now()` / `Math.random()` 必须在 `useEffect` 内执行,避免 SSR/CSR mismatch。

## 已踩坑 & 教训(立)

- **`npm run build` 跟 `next dev` 同时跑**会清 `.next`,dev CSS 404,全黑文字 32px。**build 必先 kill dev**。
- **`pnpm install` vs `npm install`** 在 pnpm-lock 仓库里 NPE,要 `pnpm install` 走原 lockfile。
- **静态导出 ≠ server endpoint**: 所有"假鉴权"必须 client-side,后端 API 路由在 `output: 'export'` 下不可用。
- **`new Date().getFullYear()` 在 server vs client 不一致** → Footer year 写死或 SSR 注入。
- **`Date.now()` 在 useState 初始化** → 触发 React #418 hydration mismatch,改 `useEffect` mount 后赋值。
- **Lighthouse dev 服务跑不准**: 必须跑生产 `out/` 静态产物才能反映用户真实体验。

## 部署

`netlify.toml` 已配置,`pnpm build` 后产物在 `out/`,直接拖到 Netlify 即可。

```toml
[build]
  command = "pnpm build"
  publish = "out"
```

## 截图

`screenshots/` 下保存历史 desktop/mobile 截图(2.3 MB+,用于回归对比)。
---

## /ref-peak-mall/ — 参考改写合规 demo

参考站点 `reference/peak-mall/` 源站是 **多级分销 + USDT-TRC20 + 强制邀请码** 的电商系统。
本 demo 做合规改写,展示 **如何在保留 UI 风格的同时剔除所有违规/可疑字段**。

### 路由

`http://localhost:3002/ref-peak-mall`

### 文件结构

```
src/app/ref-peak-mall/page.tsx          # demo 客户端页面 (Provider + LangSwitcher)
src/components/reference/               # 8 个 React + Tailwind 组件
  ├── AnnouncementBar.tsx
  ├── AuthSplit.tsx                      # 注册只剩 email/nickname/password/confirmPassword
  ├── CartLine.tsx
  ├── CategoryBar.tsx
  ├── DoubleBanner.tsx
  ├── HeroBanner.tsx
  ├── ProductCard.tsx
  ├── ProductModal.tsx
  ├── index.ts                           # barrel
  └── types.ts
src/lib/ref-translations.tsx            # 单 Context 双语字典 (zh + en)
reference/peak-mall/                    # 源参考包 (8 jsx + 8 tsx + analysis/ + legal/ + covers/ + sources/)
```

### 双语 (i18n) 架构

- 单 Context (`RefI18nProvider`) 包住整页子树
- `useT()` hook 共享 `lang` state(所有组件读同一份,setLang 立即全树传播)
- `useMockProducts / useMockCategories / useMockCart` 数据 hooks(zh + en 平铺)
- localStorage 持久化 key: `ref-peak-mall-lang`
- 切语言通过 header `<LangSwitcher>`(中 / EN 双按钮)

### 红线 (审计 grep)

```
邀请码字段 = 0
USDT / 分销 / 支付 / 提现 / 佣金 = 0
占位符泄漏 (__COPY_ / TODO / FIXME / [COPY:) = 0
zh → en 切换后 ref demo 内 zh 字符串残留 = 0
  (LangSwitcher 「中」按设计保留为中文)
```

### 验收

```
# dev (含 dev noise, 数字略低于 prod)
Perf 97 / A11y 96 / BP 100 / SEO 100
LCP 0.1s / CLS 0 / TBT 140ms / FCP 0.1s

# prod 静态产物待 build (pay-records TS error 阻塞,见下)
```

`pnpm build` 当前因为 `pay-records-client.tsx` 用户改动的 TS 错误 fail
(`t.payRecords.searchPlaceholder` 类型缺失)。
ref-peak-mall 自身 build 干净 — 待修 pay-records 后即可 build 全项目。

### 重跑命令

```bash
# 启动 dev
cd /Users/bz/Projects/peak-mall-demo
pnpm dev                    # localhost:3002

# 验收 zh ↔ en (4 张截图)
node /tmp/ref-i18n-shots.mjs

# 验收 EN 模式 zh 残留
node /tmp/ref-zh-clean.mjs

# 验收 i18n UI 切换
node /tmp/ref-i18n-dom.mjs

# Lighthouse (dev server, 注 dev noise)
cd /tmp/lh && ./node_modules/.bin/lighthouse \
  http://localhost:3002/ref-peak-mall \
  --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --output=html --output-path=./ref-peak-mall-desktop.html
```

### 截图 / lighthouse 存证

```
crawls/ref-i18n-screenshots/   # 4 张全尺寸 + 4 张 thumbs + README.md
crawls/lighthouse/             # ref-peak-mall-desktop.html / .json
```

### Commits

```
b707db2  feat(ref-demo): reference/peak-mall/ 合规改写 demo page
ac29492  feat(ref-demo): 引入 --ref-* design tokens (隔离命名空间)
```
