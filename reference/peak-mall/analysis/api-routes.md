# api-routes.md — 公开层 API 路由清单

> **参考站点**: https://peak-mall.com/
> **提取来源**: 单 HTML + 内联 JS(3399 行,公开可见的 `fetch('/api/...')` 调用)
> **最后更新**: 2026-09-20
> **红线**: 已剔除 `/api/admin/*` `/api/agent/*` 与任何 invite/withdraw/commission 端点

## 公开层(可搬)— 13 条

### 认证
| Method | Path | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 邮箱 + 密码登录,返回 `user` + token |
| POST | `/api/auth/register` | 邮箱 + 密码 + 昵称 注册。**不带邀请码字段** |

### 商品
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/categories` | 分类列表 `[{id, name, count?}]` |
| GET | `/api/products?category=&keyword=` | 商品列表,支持分类过滤 + 关键词搜索 |
| GET | `/api/products/:id` | 商品详情 |

### 购物车
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/cart` | 当前用户购物车 |
| POST | `/api/cart` | 加入商品 `{productId, qty}` |
| PUT | `/api/cart/:id` | 改数量 `{qty}` |
| DELETE | `/api/cart/:id` | 移除行 |

### 我的
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/me` | 当前登录用户信息 |
| GET | `/api/me/profile` | 个人资料 |

### 配置
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/config/home` | 首页 Hero 配置(title/subtitle/notice) |
| GET | `/api/config/support` | 客服信息(展示用,不调用后台) |

## 已剔除(不搬)— 30 条

### `/api/admin/*` 全部(8 路由族)
- `/api/admin/dashboard`
- `/api/admin/users` (CRUD + toggle + resetpwd)
- `/api/admin/products` (CRUD)
- `/api/admin/orders` (CRUD)
- `/api/admin/agents` (CRUD — 多级代理配置)
- `/api/admin/commissions` (佣金结算)
- `/api/admin/invite-codes` (CRUD — 邀请码)
- `/api/admin/rules` (结算模式/提现规则)
- `/api/admin/withdrawals` (CRUD + approve/pay/reject)
- `/api/admin/home` / `/api/admin/support` / `/api/admin/tickets` / `/api/admin/demo`

### `/api/agent/*` 全部(5 路由族)
- `/api/agent/dashboard` / `/api/agent/team` / `/api/agent/commissions`
- `/api/agent/rates` / `/api/agent/withdrawals`

### `/api/fx/*` 全部(分销中心,4 路由族)
- `/api/fx/dashboard` / `/api/fx/team` / `/api/fx/commissions` / `/api/fx/withdrawals`

### 提现 / 资金密码 / 邀请码 / 地址
- `/api/me/withdraw-address` (绑定 USDT-TRC20 地址)
- `/api/me/funds` (查询资金密码状态)
- `/api/me/funds-password` (设置/改资金密码)

### 客服工单(虽然不是红线,但跟订单/支付强耦合)
- `/api/me/tickets` (我的工单)
- `/api/admin/tickets` (工单后台)

## 数据形状(推断)

```ts
// GET /api/products
type ProductListItem = {
  id: number;
  name: string;
  subtitle?: string;
  price: number;        // USD
  currency: 'USD';      // 源站固定 USD(资金类强制 USD)
  category: string;
  stock: number;
  status: 'active' | 'inactive';
  coverEmoji?: string;
  cover?: string;       // /uploads/xxx.jpg (源站本地)
};

// GET /api/cart
type CartLine = ProductListItem & {
  qty: number;
  addedAt: string;      // ISO
};

// POST /api/auth/login response
type LoginResp = {
  user: { id: number; username: string; nickname: string; role: 'user' };
  token: string;
};

// POST /api/auth/register — body 只含 {email, password, nickname}
// 红线: 已剔除 {ref: '邀请码'},合规版不接收该字段
```

## 安全建议

- ⚠️ 源站所有 `/api/admin/*` 不带权限前缀判断,纯靠前端 hide 菜单 — 自己接入时**必须**加 `requireRole('admin')` 中间件
- ⚠️ `/api/auth/login` 失败无锁定 — 加 `useRateLimit(5/15min)`
- ⚠️ `/api/me` 用 localStorage token + cookie — 自己接入时改 httpOnly + SameSite=Lax cookie
- ⚠️ `/api/products` 无分页参数 — 加 `?page=&limit=`(默认 20,上限 100)