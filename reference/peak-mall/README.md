# reference/peak-mall/ — 普通商城参考包

参考站点: https://peak-mall.com/(国内电商站点)
项目位置: `/Users/bz/Projects/peak-mall-demo/reference/peak-mall/`
目标产物: 4-section package(组件 + 设计 token + 分析 + 法务占位)

## ⚠️ 红线声明

源站是**多级分销 + USDT-TRC20 加密支付 + 强制邀请码**的电商系统。本参考包:

| 类别 | 命中 | 处理 |
|---|---|---|
| USDT / TRC20 / 加密支付 | 91 | ❌ 完全不搬 |
| invite / 邀请码 | 51 | ❌ 注册表单删除此字段 |
| agent / 多级代理 | 51 | ❌ 不搬 |
| withdraw / 提现 | 111 | ❌ 不搬 |
| commission / 佣金 | 55 | ❌ 不搬 |

参考 skill `reference-rewrite-package` 红线 4/5/6。

**本包只搬"普通商城骨架":商品列表 / 商品详情 / 购物车 / 注册登录 / 滚动公告 / 推广 banner。**

任何分销/加密/多级代理模块一律不含。即便用户后续加新功能,也禁止触碰。

## 目录结构

```
reference/peak-mall/
├── components/          # 8 React+Tailwind 组件(.jsx),所有文字 [COPY:section.key]
│   ├── AnnouncementBar.jsx CategoryBar.jsx ProductCard.jsx HeroBanner.jsx
│   ├── CartLine.jsx DoubleBanner.jsx AuthSplit.jsx ProductModal.jsx
│   ├── index.js README.md
├── components-ts/       # TS 端口(types.ts + 5 个 .tsx + barrel index.ts)
│   ├── types.ts AnnouncementBar.tsx CategoryBar.tsx
│   ├── ProductCard.tsx CartLine.tsx AuthSplit.tsx
│   ├── index.ts README.md
├── analysis/
│   ├── design-tokens.js     # 色板/字体/间距/radius/shadow + Tailwind + CSS vars
│   ├── api-routes.md        # 公开 API 路由清单(13 条 + 30 条已剔除)
│   ├── architecture.md      # 路由+state+data flow+Zustand 建议+API client 封装
│   ├── db-schema.md         # 8 张表 Prisma schema(合规版,不含分销/加密)
│   ├── ui-components.md     # 组件清单 + a11y + perf + breakpoint
│   ├── biz-logic.md         # 源站观察 vs 法务安全建议两列对比
│   ├── frontend-static.json # routes + forms + i18n + currencies + API + errors
│   ├── frontend-css.json    # 全部 class names + rules + media queries
│   └── MIGRATION.md         # 怎么搬进现有项目(Next.js + peak-mall-demo)
├── legal/
│   ├── privacy-policy.md    # 12 章 PIPL 骨架 + [LAWYER 填写] 占位
│   ├── terms.md             # 16 章用户协议骨架 + [LAWYER 填写] 占位
│   ├── refund.md            # 12 章退款政策骨架 + [LAWYER 填写] 占位
│   └── README.md            # 律师审核 checklist + 红线 vs 合规对照
├── scripts/
│   └── gen-covers.mjs       # 8 个本地 SVG 占位图生成器
├── public/
│   └── covers/p{1..8}.svg   # 占位图产物(每个 ~1KB)
└── sources/
    └── html/home.html       # 3399 行公开 HTML 镜像(只读参考)
└── README.md                # 本文件
```

## 进度(全部完成)

- [x] 抓公开首页(3399 行,227 KB)
- [x] 提取完整 design tokens
- [x] 识别红线(USDT/invite/agent/withdraw/commission)并剔除
- [x] `components/` — 8 个 React+Tailwind 组件,76 占位/38 key
- [x] `components-ts/` — types + 5 个 TS 端口 + barrel
- [x] `analysis/` — 8 份(design-tokens.js + api-routes + architecture + db-schema + ui-components + biz-logic + frontend-static.json + frontend-css.json + MIGRATION)
- [x] `legal/` — 4 份(privacy-policy 12 章 + terms 16 章 + refund 12 章 + README)
- [x] `scripts/gen-covers.mjs` — 8 个本地 SVG 占位图(每个 ~1KB)
- [x] `public/covers/p{1..8}.svg` — 占位图产物
- [x] esbuild 编译 9 jsx + 7 ts/tsx 全 0 错误

## 用法

```bash
# 1. 把 design tokens 注入项目
cat reference/peak-mall/analysis/design-tokens.js   # 看 cssVars 块,贴到 globals.css

# 2. 引入组件(纯占位,无业务逻辑)
import { ProductCard, CategoryBar } from '@/reference/peak-mall/components';

# 3. 接入文案 i18n
# grep '__COPY_' reference/peak-mall/components/*.jsx
# 把所有 '__COPY_section.key__' 替换成你的 i18n 调用,如 t('product.addToCart')
```

## 验证

```bash
# 1. 占位总数(应 ~76)
grep -roh "'__COPY_[a-zA-Z0-9_.]*__'" reference/peak-mall/components/ reference/peak-mall/components-ts/ | wc -l

# 2. 唯一占位 key(应 38)
grep -roh "'__COPY_[a-zA-Z0-9_.]*__'" reference/peak-mall/components/ reference/peak-mall/components-ts/ | sort -u | wc -l

# 3. 红线零命中(代码里,排除注释)
find reference/peak-mall/components reference/peak-mall/components-ts -type f \( -name '*.jsx' -o -name '*.tsx' \) -exec grep -E 'USDT|TRC20|邀请码|分销|commission' {} \; | grep -v '^[^:]*:[0-9]*:[ ]*//' | wc -l
# 应 0

# 4. esbuild 编译
npx --yes esbuild reference/peak-mall/components/*.jsx --bundle=false --outdir=/tmp/x --log-level=error
npx --yes esbuild reference/peak-mall/components-ts/*.tsx --bundle=false --loader:.tsx=tsx --outdir=/tmp/x --log-level=error
# 两行都应无 error
```

## 不做什么

- ❌ 不写支付(Stripe / Adyen / USDT 都由你自己接)
- ❌ 不写 wishlist / cart persist 持久化(留 `// TODO`)
- ❌ 不写 admin 后台(原站 admin 是分销后台,本包完全不含)
- ❌ 不写多语言 i18n(本包按中文骨架写,en 由用户自行翻译)
- ❌ 不引用任何外链图(cover 用 emoji fallback 或用户自传)
- ❌ 不复制源站任何文案(`[COPY:xxx]` 是占位,不是复制)