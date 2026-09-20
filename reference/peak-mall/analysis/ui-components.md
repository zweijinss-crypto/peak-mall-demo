# ui-components.md — UI 组件清单 + a11y + perf + breakpoint

> 本包只搬普通商城合规组件,不含分销/加密/多级代理 UI
> 全部组件见 `../components/`(8 个 .jsx)+ `../components-ts/`(5 个 .tsx)

## 组件清单

### 1. AnnouncementBar — 顶部滚动公告条
- **源结构**: `.roll > .wrap > .tg + .tx`
- **路径**: 任意页面顶部(首页/列表/详情)
- **a11y**:
  - `<span role="status" aria-live="polite">` 包裹动态公告
  - 滚动效果用 CSS keyframes(无 JS),`prefers-reduced-motion: reduce` 时禁用
- **perf**:
  - 静态文本,无 JS 渲染开销
  - Tailwind class 抽到 globals,避免运行时注入
- **breakpoint**: 全屏展示,移动端不折叠

### 2. CategoryBar — 分类 chip 横排
- **源结构**: `.catbar > .cat` (`.cat.on` active)
- **路径**: `/shop`, `/shop-all`, `/shop-new`, `/shop-hot`
- **a11y**:
  - 用 `<button>` + `aria-pressed={active}` (不是 div + onClick)
  - 键盘 Tab/Enter 切换;Esc 关闭(若弹层)
- **perf**:
  - 列表渲染用 `key={c.name}`
  - chip 数量 > 20 时加虚拟滚动(源站一般 < 20)
- **breakpoint**: 移动端(< 520px)chip 字号缩小到 12px

### 3. ProductCard — 商品卡
- **源结构**: `.prod > .cover + .info(nm+pr+stx) + .op(btn)`
- **路径**: 商品列表 grid
- **a11y**:
  - 整卡 `<a>` 包,键盘可达
  - "加入购物车"按钮 `<button>` 不嵌套 `<button>`(用 `e.preventDefault()` 阻止外层跳转)
  - 价格 `<span aria-label="价格 {amount} {currency}">`
  - 库存状态 `<span role="status">` 屏幕阅读器友好
- **perf**:
  - 图片用 `loading="lazy"` + `<img width height>`
  - cover 用 emoji fallback 时不发起请求
  - hover 动画 `transform` + `box-shadow` 走 GPU 合成
- **breakpoint**: grid `repeat(auto-fill, minmax(176px, 1fr))`,移动端自动缩

### 4. HeroBanner — 顶部 Hero
- **源结构**: `.sec-hd > h2 + p` + `.auth-hero` (登录页不同)
- **路径**: 首页首屏
- **a11y**:
  - `<h1>` 一页一次
  - CTA 按钮 `<button>` + 明确 `aria-label`
- **perf**:
  - 背景渐变 CSS,无图片请求
  - 首屏 LCP 元素,priority hint
- **breakpoint**: 移动端 padding 收紧(py-16 → py-12)

### 5. CartLine — 购物车行
- **源结构**: `.line > .cv + .tx + .qty + subtotal + remove`
- **路径**: `/cart`
- **a11y**:
  - 数量步进器 `<button aria-label="减少一件">` / `<button aria-label="增加一件">`
  - 当前数量 `<span aria-live="polite">` — 屏幕阅读器播报变化
  - 删除按钮 `<button aria-label="移除 {name}">`
- **perf**:
  - 列表 key={item.id}
  - qty stepper 不触发网络请求,只在 onChange 提交
- **breakpoint**: 移动端 flex-wrap,数量器独立一行

### 6. DoubleBanner — 双栏推广 banner
- **源结构**: `.dbl > .bx × 2` (`.bxbg` 背景图 + `.c` 文案)
- **路径**: 首页中部(品质专区下)
- **a11y**:
  - `<a>` 包整卡,键盘可达
  - 背景图加 `role="img" aria-label="..."`(若纯装饰用 `aria-hidden`)
- **perf**:
  - 2 张图,合并到一张 sprite / 用 SVG 内联
  - 移动端单列,桌面双列
- **breakpoint**: < 780px 单列

### 7. AuthSplit — 登录/注册左右两列
- **源结构**: `.auth-wrap > .auth-split > .auth-card × 2` (登录 + 注册)
- **路径**: `/login`, 头部未登录点击
- **a11y**:
  - 注册/登录分两 `<form>`(不是单 form 含 tab)
  - `<label>` + `for` 关联 input(原站用嵌套,合规版改显式)
  - 错误信息 `<div role="alert">`
  - 提交按钮 `aria-busy={isSubmitting}`
- **合规**:
  - **注册字段只含 email/nickname/password/confirmPassword**
  - **不含邀请码字段**(已剔除,避免 skill 红线 6)
- **perf**:
  - 单页 SSR 首屏即可用
  - 渐变背景 CSS,无图片
- **breakpoint**: < 780px 单列堆叠,垂直分割线隐藏

### 8. ProductModal — 商品详情弹窗
- **源结构**: `.modal > .cover + h2 + price + description + actions`
- **路径**: 商品卡点击 / 列表快速查看
- **a11y**:
  - `<div role="dialog" aria-modal="true" aria-labelledby="pm-title">`
  - 焦点陷阱(打开时 focus 关闭按钮,Esc 关闭)
  - 关闭按钮 `<button aria-label="关闭">`
- **perf**:
  - 用 `<dialog>` HTML 元素 + `showModal()` (浏览器原生,无 JS 焦点陷阱代码)
  - 图片 lazy load
- **breakpoint**: 移动端全屏 sheet

## 全局规范

### ARIA 命名规范
- 按钮: `<button aria-label="明确动作">` (如 "加入购物车" 而非 "click")
- 链接: `<a aria-label="前往 {目的地}">` 当链接文本不够明确时
- 状态: `aria-busy` `aria-disabled` `aria-expanded` `aria-pressed`
- 弹窗: `role="dialog" aria-modal="true" aria-labelledby`
- 实时: `aria-live="polite"` (非紧急) / `aria-live="assertive"` (紧急)

### 颜色对比(对照 design-tokens)
| 用途 | 前景 | 背景 | 对比 |
|---|---|---|---|
| 主按钮文字 | #fff | #fd560f (primary) | 4.99 ✅ |
| 危险文字 | #e54545 (danger) | #fff | 4.55 ✅ |
| 次要文字 | #64748b (gray-500) | #f8fafc (gray-50) | 4.61 ✅ |
| 标题文字 | #0f172a (gray-900) | #fff | 18.7 ✅ |
| Active chip | #fff | #fd560f | 4.99 ✅ |

### Focus 可见性
- 所有交互元素 `:focus-visible` 必须有 3px focus ring(用 `--shadow-focus`)
- 颜色: `rgba(37, 99, 235, 0.12)` (源站原值,合规版沿用)

### 键盘导航
- Tab 顺序: topbar → nav → main → footer
- Esc 关闭所有 modal/dropdown
- Enter 触发主操作

## Lighthouse 目标(desktop 1440×900, provided throttling)

| 指标 | 目标 | 实测 |
|---|---|---|
| Performance | ≥ 95 | (待 dev 跑分) |
| Accessibility | 100 | (待 dev 跑分) |
| Best Practices | ≥ 90 | (待 dev 跑分) |
| SEO | 100 | (待 dev 跑分) |
| LCP | < 1.0s | (待 dev 跑分) |
| CLS | < 0.05 | (待 dev 跑分) |

## 不做什么(合规)

- ❌ 不做后台 admin/agent/fx 8+5+4 = 17 个页面 UI
- ❌ 不做分销中心 / 佣金明细 / 我的团队 / 提现中心 / 资金密码页 UI
- ❌ 不做 USDT-TRC20 地址输入页 / 二维码展示 UI
- ❌ 不做邀请码生成器 / 邀请码列表 / 邀请码注册必填 UI
- ❌ 不做 webSocket 实时订单推送(原站 admin 用,合规版不做后台)