# components/ — 普通商城骨架(8 个)

参考 https://peak-mall.com/ 公开页面提取的**合规**组件骨架。
**所有 UI 文字 = `[COPY:section.key]` 占位符**,不搬原文。

## 红线(已剔除)

| 类别 | 数量 | 处理 |
|---|---|---|
| USDT / TRC20 / 加密支付 | 91 命中 | ❌ 不搬 |
| invite / 邀请码 | 51 命中 | ❌ 注册表单删除此字段 |
| agent / 多级代理 | 51 命中 | ❌ 不搬 |
| withdraw / 提现 | 111 命中 | ❌ 不搬 |
| commission / 佣金 | 55 命中 | ❌ 不搬 |

参考 skill `reference-rewrite-package` 红线 4/5/6。

## 组件清单

| 文件 | 来源结构 | props |
|---|---|---|
| `AnnouncementBar.jsx` | 原站 `.roll` 滚动公告条 | `{ text }` |
| `CategoryBar.jsx` | 原站 `.catbar` chip 横排 | `{ cats, active, onPick }` |
| `ProductCard.jsx` | 原站 `.prod` 商品卡 | `{ product, onAddToCart, href }` |
| `HeroBanner.jsx` | 原站首屏 hero + 标题 + 副标题 | `{ title, subtitle, ctaLabel, onCta, background }` |
| `CartLine.jsx` | 原站 `.line` 购物车行 + `.qty` stepper | `{ item, onChangeQty, onRemove, currency }` |
| `DoubleBanner.jsx` | 原站 `.dbl` 双栏推广 banner | `{ items: [{ title, subtitle, ctaLabel, href, onCta, background }] }` |
| `AuthSplit.jsx` | 原站登录/注册左右两列 | `{ onLogin({email, password, remember}), onRegister({email, nickname, password}) }` |
| `ProductModal.jsx` | 原站 modal 商品详情 | `{ product, open, onClose, onAddToCart }` |

## 用法

```jsx
import { ProductCard, CategoryBar, HeroBanner } from './components';
import { tokens } from './analysis/design-tokens';

// 在 layout/globals.css 顶部贴入 tokens.cssVars(见 analysis/design-tokens.js)
// Tailwind 用户: 把 tokens.tailwindConfig 合并进 tailwind.config.ts

<ProductCard
  product={{
    id: 1, name: 'Sample', price: 199.00, currency: 'USD',
    coverEmoji: '📦', stockStatus: 'in_stock',
  }}
  onAddToCart={(p) => console.log('add', p)}
/>
```

## 文案占位清单(grep `[COPY:` 找全部)

```
announcement.tag       announcement.text
category.all
product.name           product.subtitle        product.coverFallback
product.stock.in       product.stock.low       product.stock.out
product.addToCart
cart.name              cart.coverFallback      cart.remove
doubleBanner.slot1Title doubleBanner.slot1Subtitle doubleBanner.slot1Cta
doubleBanner.slot2Title doubleBanner.slot2Subtitle doubleBanner.slot2Cta
auth.brandTitle        auth.brandSubtitle
auth.login.title       auth.register.title
auth.field.email       auth.field.password     auth.field.nickname     auth.field.confirmPassword
auth.placeholder.email auth.placeholder.password auth.placeholder.nickname
auth.placeholder.passwordNew  auth.placeholder.passwordConfirm
auth.remember          auth.login.cta          auth.register.cta
modal.close
hero.title             hero.subtitle
```

## 不做什么

- ❌ 不写支付逻辑(Stripe / Adyen / 加密都用户自己接)
- ❌ 不写 wishlist / cart persist(留 `// TODO`)
- ❌ 不写 admin 后台
- ❌ 不写多语言(原站是 zh/en,但本包按 zh 写,en 由用户自己 i18n)
- ❌ 不引用任何外链图(cover 用 emoji fallback 或用户自传)