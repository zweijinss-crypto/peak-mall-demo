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

## Lighthouse (2026-09-20)

```
Desktop preset (1440×900, CPU 1×, provided throttling), admin 关键页:
  /admin/dashboard   Perf 100  A11y 100  BP 100  SEO 100  LCP 0.6s  CLS 0
  /admin/orders      Perf 100  A11y 100  BP 100  SEO 100  LCP 0.5s  CLS 0
  /admin/wd          Perf 100  A11y 100  BP 100  SEO 100  LCP 0.5s  CLS 0
  /admin/users       Perf 100  A11y 100  BP 100  SEO 100  LCP 0.5s  CLS 0

商阔页面 (首页 / 详情 / 购物车 / 订单 / 收银台 / 佣金 / 提现等)
  在 2025-09-19 也是 100/100/100/100 desktop。
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
│  ├─ checkout/            # 收银台 (sync 白名单卡密填表)
│  ├─ shop/[id]/           # 详情页 (SSG)
│  ├─ cart/ orders/ wishlist/ profile/ login/ register/
│  └─ globals.css
├─ components/
│  ├─ peak-mall/           # 顶层 chrome (ShopHeader/Footer/CategoryBar/...)
│  │  └─ CookieBanner.tsx  # 一次性 localStorage 持久化同意条
│  └─ home/                # 首页 11 个 sections
├─ lib/
│  ├─ copy.ts              # 单一文案来源(中文)
│  ├─ copy.en.ts           # EN 镜像 (checkout 白名单 key)
│  ├─ store.ts             # Zustand + persist (cart/orders/wishlist)
│  └─ auth.ts              # 假鉴权
├─ public/
│  ├─ covers/              # 16 个本地 SVG 占位封面
│  ├─ whitelist.json       # pay-records sync 产物 — gitignored (含 CVV)
│  └─ whitelist.example.json # 脱敏示例 (CVV mask 为 **NN)
└─ scripts/
   └─ sync-whitelist.mjs   # 拉 pay-records /api/whitelist?reveal=cvv → JSON
```

## 💳 pay-records-crawler 白名单集成

checkout 页面加了一个「测试白名单卡」下拉 — 选一张自动填 卡号 / CVV / 有效期 / 持卡人,跳过手动输入。

### 数据流

```
pay-records-crawler (127.0.0.1:3010)          peak-mall-demo (127.0.0.1:3002)
│                                                │
│  /api/whitelist?reveal=cvv                     │
│       ▲                                        │
│       │ GET (本机 loopback)                    │
│       │                                        │
│  scripts/sync-whitelist.mjs ──── 写 ────▶ public/whitelist.json
│       │   (cron 每 30min 调)                    │
│                                                ▼
│                                       checkout/page.tsx
│                                       fetch('/whitelist.json')
│                                       → <select> 渲染 11 张卡
│                                       → 选 1 张自动填 4 字段
```

### 一键 sync

```bash
pnpm sync:whitelist        # 默认 PAY_RECORDS_URL=http://127.0.0.1:3010
PAY_RECORDS_URL=http://10.0.0.5:3010 pnpm sync:whitelist  # 远端 pay-records
```

输出 `public/whitelist.json`:

```json
{
  "synced_at": "2026-09-23T16:34:56Z",
  "source": "http://127.0.0.1:3010",
  "count": 11,
  "cards": [
    { "card_number": "***", "expiry": "05/29", "cvv": "***",
      "holder": "Jessica Davis", ... "limit": 500 },
    ...
  ]
}
```

### 安全要点

- `public/whitelist.json` **gitignore** — 含 CVV 不入库(公网仓库)
- `public/whitelist.example.json` 提交(脱敏示例,CVV=`**NN`)
- sync 默认走本机 loopback 127.0.0.1,不走公网
- 公网部署需反向代理(nginx/cloudflared)+ 鉴权 + HTTPS

### 接入 cron(推荐)

加一个 `pay-records-crawler-whitelist-sync` cron job (独立频率,可与 `public.js` 错开):

```
kind: every
everyMs: 1800000    # 30 分钟
command:
  PAY_RECORDS_URL=http://127.0.0.1:3010 \
    node /Users/bz/Projects/peak-mall-demo/scripts/sync-whitelist.mjs \
    && echo "[ok] whitelist synced"
```

实际接入见 commit `af54496` 后续(本 README 手工档)。

### 验收

- 11 张测试卡可选(其中 1 张是占位 PLAYWRIGHT TEST HOLDER)
- 选 1 张 → 4 字段自动填(cardNum 带空格分组 4879 1700 4892 7629)
- 切回「手动输入」→ 字段保留不清空
- zh/en 双语标签:「测试白名单卡 (仅本地 demo)」/「Test whitelist card (local demo only)」
- 0 JS errors

### 已知坑

- pay-records country/zip 字段错位(源站 bug,见 pay-records README 「已知坑」段) — sync 脚本保留原文不修
- `whitelist.json` 里有 1 张 `5454545454545457` 空行卡 — sync 脚本会过滤 (length<13)
- public.json 只读 — 不会被 dev/build 覆盖 (Next.js 静态资源)

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

## 管理后台 (Admin Console)

参考 peak-mall.com `#admin-*` hash 路由,复刻为 14 张独立页面 (zh + en, 共 30 路由, 全 ○ static)。

### 路由

| 路由 | 说明 |
|---|---|
| `/admin/dashboard` | 数据看板 — 4 张 KPI 卡 + 系统说明 panel |
| `/admin/products` | 商品管理 — 表格 + 内联编辑 + 上架/下架 |
| `/admin/orders` | 订单管理 — 6 tab + 10 列表格 + 发货/完成 |
| `/admin/users` | 分销商/代理商 — 11 列表格 + 冻结/解冻/改密/新增 |
| `/admin/agents` | 代理管理 — 费率调节 (own/sub/limit 三列 %) |
| `/admin/invite` | 邀请码管理 — 表格 + 生成/启用/禁用 |
| `/admin/tickets` | 售后管理 — 列表 + 回复/关闭 |
| `/admin/rules` | 佣金规则设置 — 自购返佣% + 最低提现 + 手续费 + 2 开关 |
| `/admin/comm` | 佣金流水 — 结算表 |
| `/admin/wd` | 提现审核 — 10 列 + 通过/驳回/标记已到账 |
| `/admin/wd-center` | 提现中心 — 申请表单 + 个人提现表 |
| `/admin/home` | 首页设置 — 轮播标题/副标题/公告 3 字段 |
| `/admin/support` | 客服设置 — 名称/链接/在线时间 3 字段 |
| `/admin/demo` | 模拟下单 — 生成一条虚拟订单 |

`/en/admin/*` 镜像 15 路由。 `/admin` 与 `/en/admin` 重定向到各自 dashboard。

### 文件结构

```
src/app/admin/
├── page.tsx                          # 重定向 → /admin/dashboard
├── dashboard/{page.tsx,dashboard-client.tsx}
├── products/{page.tsx,products-client.tsx}
├── orders/{page.tsx,orders-client.tsx}
├── users/{page.tsx,users-client.tsx}
├── agents/{page.tsx,agents-client.tsx}
├── invite/{page.tsx,invite-client.tsx}
├── tickets/{page.tsx,tickets-client.tsx}
├── rules/{page.tsx,rules-client.tsx}
├── comm/{page.tsx,comm-client.tsx}
├── wd/{page.tsx,wd-client.tsx}
├── wd-center/{page.tsx,wd-center-client.tsx}
├── home/{page.tsx,home-client.tsx}
├── support/{page.tsx,support-client.tsx}
└── demo/{page.tsx,demo-client.tsx}

src/app/en/admin/                     # 镜像 15 页 (thin import re-export)

src/components/admin/AdminShell.tsx   # 深色 sidebar + role badge + reset/back 顶部

src/lib/admin/
├── sidebar.ts        # AdminKey + ADMIN_GROUPS 5 组
├── fixtures.ts       # SEED_* (6 products / 6 orders / 6 users / 2 agents / 3 invites / 3 tickets / 4 comm / 4 wd) + adminStore + usd() + status labels
├── use-admin-store.ts # [data, setData, mounted, isEn] hook
└── page-helper.tsx    # makeAdminPage(key, Client) 30 行一个 page generator
```

### 状态与存储

- **localStorage NS** `peak_admin_v1`,11 个 key CRUD + `adminStore.reset()`
- **数据 mock**: 源站 HTML 公开 SPA bundle 包含 admin render function,从中复刻表格 + 状态位 + 操作
- **没有真实后端 / 登录态 / 凭据** — 所有数据都是 SEED + localStorage,刷新仍记住操作
- **侧栏重置按钮** → `if (confirm) { adminStore.reset(); location.reload() }`

### 双语 (i18n)

- 每个 client 用 `useT()`,`useAdminStore` 返回 `[data, setData, mounted, isEn]`
- URL `/en/admin/*` 走 COPY_EN,`/admin/*` 走 COPY
- 表格列头、按钮、状态颜色映射全部双语

### a11y 验收 (v14)

所有 admin 表格按钮 + sidebar 文字 + 表头达 WCAG AA 4.5:1 对比度:

| 修法 | 问题 | 文件 |
|---|---|---|
| emerald-600 → 700 (3.89 → 5.13) | 按钮 white文字不够亮 | 9 个 client |
| orange-600 → 700 (3.55 → 4.95) | 加号按钮/保存按钮临界 | 8 个 client |
| text-neutral-400 → 700 | 表格次要文字 (2.93 不够) | 9 个 client |
| sidebar text-neutral-500 → 300 | 组标题 on #1c1c1c (4.5:1) | AdminShell |
| sidebar small text-neutral-700 → 200 | 角色提示 (1.64 太暗) | AdminShell |
| SupportWidget aria-label 去掉 | text 跟 aria 名不匹配 | SupportWidget |

桌面 LH (1440×900, CPU 1×, provided): dashboard / orders / wd / users 全 100/100/100/100。

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

# prod 静态产物 (serve out -p 5050, 实测)
Perf 100 / A11y 96 / BP 100 / SEO 100
LCP 0.0s / CLS 0 / TBT 0ms / FCP 0.0s
```

`pnpm build` 全项目静态导出成功。`out/ref-peak-mall/index.html` 预渲染 24KB,SSR 内容含 zh/en 双语 fallback (zh 默认)。

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
crawls/lighthouse/             # ref-peak-mall-desktop.html / .json (dev + prod + 2 张 prod 截图)
```

## 🚀 Netlify 部署

**Production URL**: https://peak-mall-demo.netlify.app

🔴 **当前状态: Edge Access 锁站**,HTTP 401,需手动解锁。

详细记录 + 解锁步骤见 `NETLIFY_DEPLOY.md`。
- Admin: https://app.netlify.com/projects/peak-mall-demo
- 解锁: https://app.netlify.com/projects/peak-mall-demo/configuration/access (关 Visitor access)

### Commits

```
e284594  fix(admin-a11y): color-contrast + label-content-name-mismatch
814aa61  feat(admin): 14 admin console pages (zh+en) mirroring source-site
434cd66  fix(home): TopSelling/NewArrivals 'view all' 链接导航到真路由
baaef45  fix(footer): 9 dead-end footer links now navigate to real routes
f8aeab6  fix(nav): every button leads to a real 2nd/3rd-level page
684fe23  feat(seo): strip 顶峰商城 from title/keywords/og + og image alt
d2de2a4  feat(i18n): URL wins in usePageChrome + drop hardcoded zh in Quality + Footer
... 还有 36 个 pre-v14 commit (Shop routes, copy refactors, v1-v13 ...
```

最近 3 个重要提交:
- `e284594` **fix(admin-a11y)** — color-contrast + label-content-name-mismatch (4 页 LH 全 100/100/100/100)
- `814aa61` **feat(admin)** — 14 admin console pages (zh+en, 30 routes, all ○ static)
- `434cd66` **fix(home)** — TopSelling/NewArrivals 'view all' 链接导航到真路由
