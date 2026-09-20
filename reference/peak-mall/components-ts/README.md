# components-ts/ — TS 端口

类型化的 React + Tailwind 组件。types 集中放在 `types.ts`。

## 已 TS 化(5)

- `AnnouncementBar.tsx`
- `CategoryBar.tsx`
- `ProductCard.tsx`
- `CartLine.tsx`
- `AuthSplit.tsx`

## 占位用 .jsx(3)

- `HeroBanner.tsx` / `DoubleBanner.tsx` / `ProductModal.tsx` — 类型简单,沿用 `components/*.jsx`,需要时再 port。

## 类型一览(`types.ts`)

```ts
type CurrencyCode = 'USD' | 'EUR' | 'CNY' | 'JPY' | 'KRW' | string;
type StockStatus  = 'in_stock' | 'low' | 'out';

interface Product             { id, price, currency?, stockStatus?, cover?, coverEmoji? }
interface ProductWithText     extends Product { name, subtitle?, description? }
interface Category            { name, count? }
interface CartItem            { id, qty, cover?, coverEmoji? }
interface CartLineItem        extends CartItem { name, subtitle?, price, currency? }
interface BannerSlot          { title, subtitle?, ctaLabel?, href?, onCta?, background? }
interface LoginPayload        { email, password, remember? }
interface RegisterPayload     { email, nickname?, password }
interface AuthHandlers        { onLogin?, onRegister? }
```

**红线**: 不含 wallet/address/withdraw/invite/agent/commission 任何类型。

## 用法

```tsx
import { ProductCard, CategoryBar } from '@/components-ts';
import type { ProductWithText, Category } from '@/components-ts';

const cats: Category[] = [{ name: '数码', count: 12 }, { name: '家电', count: 8 }];
const prod: ProductWithText = {
  id: 1, name: 'Sample', price: 199, currency: 'USD', stockStatus: 'in_stock', coverEmoji: '📦',
};

<ProductCard product={prod} onAddToCart={(p) => console.log(p)} />
<CategoryBar cats={cats} active="数码" onPick={(n) => console.log(n)} />
```