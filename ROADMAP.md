# peak-mall-demo 真运营改造清单

> 立项日期：2026-09-22
> 当前 HEAD：`f679108` (A11y 全 100 / 静态导出可用)
> 目标：从「演示项目」拉到「真运营收钱」

---

## 总览：当前 → 真运营 缺什么

| 层 | 现状 | 缺 |
|---|---|---|
| 数据 | zustand + localStorage (`src/lib/store.ts` 255 行) | 真后端 + Postgres |
| 支付 | `setTimeout(1500)` 模拟 (`src/app/checkout/page.tsx:174`) | Stripe + Webhook |
| 鉴权 | 任意邮箱 + 6 位密码；admin hardcode `admin/admin123` | NextAuth + 真 RBAC |
| 邮件 | 无 | Resend + 4 类模板 |
| 后台 | admin 全 localStorage (`src/lib/admin/fixtures.ts` 432 行) | 真 CRUD API |
| 演示痕迹 | 9 处 "演示" 字样 + admin 凭据写死 | 文案清除 |
| 合规 | 占位文案 + 简单 Cookie banner | 真法务 + GDPR 工具 |
| 监控 | 无 | Sentry + PostHog |
| CI/CD | git push 手推 | GitHub Actions + e2e |

**14 个 store 消费点 / 13 个 admin 页面 / 16 个产品 / 30 个 zh + 30 个 en 路由。**

---

## 🔴 Phase 1 — MVP 可付费上线（估 2-3 周，全栈 1 人）

### 1.1 真后端 + 数据库（8 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 1.1.1 | 选型：Supabase (Postgres + Auth + Storage 一站) 或自建 Postgres + Prisma | 决策 | 0.5d |
| 1.1.2 | 安装客户端：`pnpm add @supabase/supabase-js`（或 `prisma` + `@prisma/client`） | `package.json` | 0.5h |
| 1.1.3 | 数据库 schema（SQL migration）：`users` / `products` / `orders` / `order_items` / `addresses` / `wishlist` / `carts` / `payments` / `webhook_events` | `supabase/migrations/0001_init.sql` | 1d |
| 1.1.4 | 把 `src/data/products.ts` 16 条产品 seed 到 `products` 表 | seed script | 0.5d |
| 1.1.5 | 拆 `src/lib/store.ts` → API client；保留 store.ts 作乐观更新缓存 | `src/lib/api/*.ts` | 2d |
| 1.1.6 | 改造 14 个 store 消费点：cart / orders / wishlist / addresses / profile | `src/app/**` | 2d |
| 1.1.7 | API routes 或 RPC：`/api/products` / `/api/cart` / `/api/orders` 等（12 个端点） | `src/app/api/**` | 2d |
| 1.1.8 | 拆 `src/lib/admin/fixtures.ts` → 真表 CRUD + RLS（行级安全） | Supabase policies | 2d |

### 1.2 真支付 — Stripe（5 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 1.2.1 | 装 Stripe：`pnpm add stripe @stripe/stripe-js` | `package.json` | 0.5h |
| 1.2.2 | Stripe Dashboard：建产品 / 价格 / Webhook endpoint | Stripe 控制台 | 1h |
| 1.2.4 | `/api/checkout/session` — 创建 Stripe Checkout Session | `src/app/api/checkout/session/route.ts` | 1d |
| 1.2.5 | `/api/webhooks/stripe` — 监听 `checkout.session.completed` / `payment_intent.failed`，更新订单状态 | `src/app/api/webhooks/stripe/route.ts` | 1d |
| 1.2.6 | 改 `src/app/checkout/page.tsx:174` — 删 `setTimeout` mock；调 Stripe 重定向；订单状态机按 webhook 更新 | `src/app/checkout/page.tsx` | 1.5d |

### 1.3 真鉴权 — Supabase Auth / NextAuth（4 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 1.3.1 | 装 NextAuth 或 Supabase Auth 客户端 | `package.json` | 0.5h |
| 1.3.2 | `auth.users` 表 + JWT session；中间件保护 `/admin/*` | `src/middleware.ts` | 1d |
| 1.3.3 | 改 `src/app/login/page.tsx` + `src/app/en/login/page.tsx` — 接真登录；改 `src/components/peak-mall/AuthSplit.tsx` 调 `signIn` | login flow | 1d |
| 1.3.4 | 删 `src/lib/admin/auth.ts` 硬编码 `admin/admin123`；admin 走真账号 + RBAC | admin auth | 0.5d |

### 1.4 真邮件 — Resend（3 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 1.4.1 | 装 Resend：`pnpm add resend` + 配 API key | `package.json` + `.env` | 0.5h |
| 1.4.2 | 4 类模板：订单确认 / 发货通知 / 退款完成 / 密码重置（zh + en 各一份） | `src/emails/*.tsx` (react-email) | 1.5d |
| 1.4.3 | 接入点：Stripe webhook 触发订单确认 / admin 触发发货 / 退款流程触发 | 各 API route | 1d |

### 1.5 删演示痕迹（5 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 1.5.1 | 删 `t.auth.demoBannerTitle` / `demoBannerBody` / `demoCredsHint` 引用，改成"新用户注册"引导 | `src/app/login/page.tsx` + `src/app/en/login/page.tsx` + `copy.ts` + `copy.en.ts` | 0.5d |
| 1.5.2 | 删 `src/lib/admin/auth.ts` 的 `DEMO_USERNAME/PASSWORD` 注释 + 硬编码 | `src/lib/admin/auth.ts` | 0.5h |
| 1.5.3 | 改 `copy.ts:1062-1095` / `copy.en.ts:1088-1095` — "演示性静态电商原型" → 真服务范围文案 | `copy.ts` + `copy.en.ts` | 0.5d |
| 1.5.4 | 删 `src/app/team/page.tsx:25` `INVITE_CODE = 'PEAK-DEMO-7F3K'`；接真邀请码生成 | `src/app/team/page.tsx` | 0.5h |
| 1.5.5 | 删 `src/app/withdraw/page.tsx:38` `DEMO_FUND_PWD = '123456'`；接真 6 位资金密码（bcrypt） | `src/app/withdraw/page.tsx` | 0.5d |

### 1.6 基础监控（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 1.6.1 | 装 Sentry：`pnpm add @sentry/nextjs` + 配 DSN | `package.json` + `sentry.client.config.ts` | 0.5d |
| 1.6.2 | 装 PostHog 或 Plausible analytics（不卡 GDPR 默认同意） | `package.json` + layout | 0.5d |

**Phase 1 总估时：14-21 工作日（2.5-4 周）**

---

## 🟠 Phase 2 — 运营稳态（+1-2 周）

### 2.1 库存真扣减（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.1.1 | `products.stock` 乐观锁；下单时 `UPDATE ... WHERE stock >= qty`；事务回滚防超卖 | `src/app/api/checkout/session/route.ts` + DB | 1d |
| 2.1.2 | admin products 页库存阈值告警（已有 `stockAlert` 字段） | `src/app/admin/products/products-client.tsx` | 0.5d |

### 2.2 物流追踪（3 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.2.1 | 选型：ShipStation API / 17track / AfterShip | 决策 | 0.5d |
| 2.2.2 | admin 订单页加发货录入（tracking number + carrier） | `src/app/admin/orders/orders-client.tsx` | 1d |
| 2.2.3 | 用户订单页展示物流进度（定时拉 carrier 状态） | `src/app/orders/page.tsx` + webhook | 1d |

### 2.3 VAT / 区域税（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.3.1 | 接 TaxJar / Stripe Tax 自动算 | Stripe Tax | 1d |
| 2.3.2 | checkout 加税行 + 收据合规字段 | `src/app/checkout/page.tsx` | 0.5d |

### 2.4 退款闭环（3 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.4.1 | 改 `src/app/aftersale/page.tsx` — 提 ticket 接真 API | `src/app/aftersale/page.tsx` | 1d |
| 2.4.2 | admin 审核 + 退款（调 Stripe Refund API） | `src/app/admin/tickets/tickets-client.tsx` + `/api/refund` | 1.5d |
| 2.4.3 | 退款完成邮件通知 | 接 1.4.2 模板 | 0.5d |

### 2.5 真法务文案（1 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.5.1 | Privacy / Terms / Refund 三页 — 找真律师 / 用 Termly / Iubenda 自动生成 | 三页替换文案 | 2d |

### 2.6 Newsletter 退订（1 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.6.1 | Resend 退订 link + `/api/unsubscribe` 端点 | API + email 模板 | 0.5d |

### 2.7 风控基础（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 2.7.1 | admin 登录限流（5 次 / 5min）+ hCaptcha / Cloudflare Turnstile | middleware + login page | 1d |
| 2.7.2 | checkout 限流（防卡号枚举）+ Stripe Radar 开启 | middleware | 0.5d |

**Phase 2 总估时：5-10 工作日（1-2 周）**

---

## 🟡 Phase 3 — 规模化（+2-4 周）

### 3.1 CI/CD（3 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.1.1 | GitHub Actions：lint + typecheck + build + lighthouse a11y gate（≥95） | `.github/workflows/ci.yml` | 1d |
| 3.1.2 | Playwright e2e：核心 12 路由（home/login/cart/checkout/admin dashboard 等） | `e2e/*.spec.ts` | 3d |
| 3.1.3 | 自动部署 main → Netlify production；preview branch → preview URL | Netlify 配置 | 0.5d |

### 3.2 2FA / 高级鉴权（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.2.1 | admin 强制 2FA（TOTP / Authy / SMS） | admin profile + middleware | 2d |
| 3.2.2 | 用户端 2FA 可选 | profile + login | 1d |

### 3.3 高级监控（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.3.1 | Stripe Dashboard 接 business alerts（异常退款率 / 失败率） | Stripe 配置 | 0.5d |
| 3.3.2 | 状态页 status.peakmall.com（Netlify Status / Better Uptime / Instatus） | 新子站 | 1d |

### 3.4 客服 chat（1 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.4.1 | 接 Intercom / Crisp / Tawk；admin 端接 ticket 中心 | layout 注入 | 1d |

### 3.5 A/B 测试 / Feature flag（1 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.5.1 | PostHog feature flags / Statsig / 自建 | 集成 | 2d |

### 3.6 i18n 完整化（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.6.1 | URL-based locale（`/zh/*` `/en/*` 已存在）；补 `ja` / `ko` 等其他主市场 | `next.config` + copy.* | 3d |
| 3.6.2 | 时区 / 日期格式统一用 `Intl.DateTimeFormat`，按 locale 自动 | `src/lib/use-t.ts` | 1d |

### 3.7 admin RBAC（2 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.7.1 | 角色：super_admin / ops / cs / finance；权限矩阵 | DB + middleware | 2d |
| 3.7.2 | admin 操作审计日志（who/when/what） | `audit_log` 表 | 1d |

### 3.8 性能 / SEO 加固（3 项）

| # | 任务 | 文件 / 落点 | 估时 |
|---|---|---|---|
| 3.8.1 | 真产品图（替换 SVG 占位）+ Cloudinary / Vercel image 优化 | `public/covers/` → CDN | 1d |
| 3.8.2 | `og:image` / Twitter card 真实截图 | `src/app/layout.tsx` | 0.5d |
| 3.8.3 | 站内搜索接 Algolia / Meilisearch（产品 16 个够，pg full-text 也行） | 决策 + 集成 | 2d |

**Phase 3 总估时：10-20 工作日（2-4 周）**

---

## 总览：里程碑

```
Week 0 (now)   ──  演示站可上, GitHub + Netlify
Week 2-3       ──  Phase 1: 真后端 + Stripe + Auth + Email + 删演示
Week 4-5       ──  Phase 2: 库存/物流/税/退款/法务
Week 6-9       ──  Phase 3: CI/CD + 2FA + 监控 + i18n + RBAC + SEO
Week 10+       ──  规模扩张: 多市场 / 多币种 / 高级分析
```

---

## 决策待办（立项前你定）

1. **数据库选型**：Supabase（最快，含 Auth + Storage + RLS）vs 自建 Postgres + Prisma（更灵活，需自己搭 Auth）
2. **支付服务**：Stripe（国际主流，海外必选）vs 国内（微信/支付宝）— 看目标市场
3. **目标市场**：海外（欧美）vs 跨境（多币种 + 多语言）vs 国内
4. **邮箱服务**：Resend（开发者友好）vs SendGrid（成熟）vs Postmark（事务邮件专用）
5. **部署平台**：保留 Netlify（静态导出）vs 换 Vercel（支持 SSR，可加 API routes）
6. **预算**：免费额度能跑 MVP；Phase 2 月成本估 $50-200（Supabase + Stripe + Resend + Sentry + PostHog）

---

## 当前阻塞

- 无
- 静态站可演示 / GitHub / Netlify 一键部署