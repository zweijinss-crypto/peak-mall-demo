# architecture.md — 系统架构推断

> 参考站点 https://peak-mall.com/ 的 SPA + Express 后端架构
> 红线: 不含分销/加密/多级代理相关路径

## 1. 顶层架构

```
┌─────────────────────────────────────────────────────────────┐
│  Client (单 HTML + 内联 CSS/JS,3399 行,SPA,hash routing)    │
│  - 商品浏览 / 购物车 / 注册登录 / 个人中心(不含提现)         │
└───────────────────────────┬─────────────────────────────────┘
                            │ fetch('/api/...')
┌───────────────────────────▼─────────────────────────────────┐
│  Express 后端(nginx/1.20.1,Cache-Control: public, max-age=0) │
│  - 公开层 API: /api/auth/* /api/products /api/cart /api/me  │
│  - 后台层 API: /api/admin/* /api/agent/* (红线,不搬)        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  SQLite/MySQL(推测) — 8 张表(见 db-schema.md)               │
│  users, products, categories, carts, orders, addresses,     │
│  reviews, configs                                            │
└─────────────────────────────────────────────────────────────┘
```

## 2. 路由

### 2.1 Client(单 HTML + hash 路由)

```
# 公开路由(本包实现)
/                    → redirect to /shop
/#shop               → 商城首页(hero + 推荐 + 品质专区 + 双 banner)
/#shop-all           → 全部商品
/#shop-new           → 最新商品
/#shop-hot           → 热卖商品
/#product/:id        → 商品详情
/#cart               → 购物车
/#login              → 登录/注册(AuthSplit 组件)

# 我的(已登录)
/#profile            → 个人资料(只读,无提现)
/#my-orders          → 订单历史(只读)
/#addresses          → 收货地址
/#wishlist           → 收藏夹(留 // TODO)

# 后台路由(红线,不搬)
#/admin-*           → 8 个后台页
#/agent-*           → 5 个代理页
```

### 2.2 Server(API)

公开层见 `analysis/api-routes.md` 13 条。

## 3. State Management

源站用全局变量 + DOM 直接操作,无框架。**本包建议改用 Zustand**(已在 peak-mall-demo 现有项目使用,见 `package.json`)。

```ts
// stores/cart.ts (合规版建议)
interface CartStore {
  items: CartLine[];
  isLoading: boolean;
  error: string | null;

  fetch: () => Promise<void>;
  add: (productId: number, qty: number) => Promise<void>;
  update: (id: number, qty: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clear: () => void;

  // 派生
  count: () => number;       // 总件数
  subtotal: () => number;    // 小计
}

// stores/auth.ts
interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, nickname: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;  // refresh on app boot
}

// stores/products.ts
interface ProductsStore {
  list: Product[];
  categories: Category[];
  filters: { cat: string; kw: string };
  isLoading: boolean;

  fetch: () => Promise<void>;
  setCategory: (cat: string) => void;
  search: (kw: string) => void;
}
```

## 4. Data Flow

```
User Action (e.g. "click Add to Cart")
    ↓
Component calls store action (cartStore.add())
    ↓
Action calls API client (api.cart.add(productId, qty))
    ↓
API client does fetch('/api/cart', { method: 'POST', body })
    ↓
Server validates, updates DB
    ↓
Response { data: CartLine }
    ↓
Store updates state (items: [...prev, newItem])
    ↓
Zustand notifies subscribers
    ↓
ProductCard re-renders (badge "Added ✓")
```

## 5. API Client 封装

源站直接全局 `API()` 函数,无类型、无拦截。本包建议:

```ts
// lib/api.ts
export const api = {
  get:    async <T>(path: string) => request<T>('GET', path),
  post:   async <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put:    async <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del:    async <T>(path: string) => request<T>('DELETE', path),

  auth: {
    login:    (email: string, password: string) => post<LoginResp>('/api/auth/login', { email, password }),
    register: (email: string, nickname: string, password: string) => post<LoginResp>('/api/auth/register', { email, password, nickname }),
  },

  products: {
    list:    (cat?: string, kw?: string) => get<Product[]>(`/api/products?category=${cat}&keyword=${kw}`),
    get:     (id: number) => get<Product>(`/api/products/${id}`),
    categories: () => get<Category[]>('/api/categories'),
  },

  cart: {
    list:    () => get<CartLine[]>('/api/cart'),
    add:     (productId: number, qty: number) => post<CartLine>('/api/cart', { productId, qty }),
    update:  (id: number, qty: number) => put<CartLine>(`/api/cart/${id}`, { qty }),
    remove:  (id: number) => del<void>(`/api/cart/${id}`),
  },

  me: {
    get: () => get<User>('/api/me'),
  },
};
```

## 6. 错误处理

源站用 `try/catch + e.message + 渲染 <div class="msg err">`。本包建议:

```ts
// 全局 error middleware
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.status === 401) {
    authStore.logout();
    router.push('/login');
  }
  toast.error(e.reason?.message || 'Network error');
});
```

## 7. 不做什么

- ❌ 不实现邀请码注册字段(源站强制,合规版不接收)
- ❌ 不实现 USDT / 加密支付 / 资金密码 / 提现
- ❌ 不实现多级代理 / 佣金结算
- ❌ 不实现 admin 后台(原站 8 页 + agent 5 页 + fx 4 页)

## 8. Demo 整合建议

如果你要 peak-mall-demo 现有项目(`/Users/bz/Projects/peak-mall-demo/`)里集成本包:

```bash
# 1. 拷贝 components/ 到 src/components/peak-mall/
cp -r reference/peak-mall/components src/components/peak-mall

# 2. 拷贝 design-tokens.js 的 cssVars 进 globals.css

# 3. 创建 routes:
#   src/app/[locale]/shop/page.tsx       → CategoryBar + ProductCard grid
#   src/app/[locale]/product/[id]/page.tsx → ProductModal
#   src/app/[locale]/cart/page.tsx       → CartLine list
#   src/app/[locale]/login/page.tsx      → AuthSplit

# 4. lib/i18n.ts:
#   把所有 '__COPY_section.key__' 替换成 t('section.key')
#   i18n 文件: messages/zh.json, messages/en.json
```

详见 `MIGRATION.md`。