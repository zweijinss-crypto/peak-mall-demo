# db-schema.md — 数据库 Schema 推断

> 推测 — 源站后端代码不可见,以下根据 API 调用 + 字段反推
> 所有 `推测` 标注的字段,接入时需根据实际 DB 调整

## ER 概览

```
users ───┬─── carts ─── cart_items ─── products ─── categories
         ├─── orders ─── order_items
         ├─── addresses
         └─── reviews ─── products

configs (单行 KV 配置表)
```

**红线**: 不含 `withdrawals` `commissions` `agents` `invite_codes` `funds_password` `withdraw_address` 表 — 这些跟分销/加密/多级代理相关,本包不实现。

## 1. users

```prisma
model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  passwordHash  String   // bcrypt
  nickname      String?
  role          Role     @default(USER)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  carts         Cart[]
  orders        Order[]
  addresses     Address[]
  reviews       Review[]

  @@map("users")
}

enum Role { USER }              // 红线: 不含 ADMIN/AGENT/FX — 合规版只做普通用户
enum UserStatus { ACTIVE BANNED }
```

**红线剔除**:
- ❌ `inviteCode` `invitedBy` `refChain` (多级分销)
- ❌ `usdtAddress` `fundsPassword` (加密 + 资金密码)
- ❌ `commissionRate` (佣金)
- ❌ `role: ADMIN/AGENT/FX` (角色后台)

## 2. products

```prisma
model Product {
  id           Int      @id @default(autoincrement())
  name         String
  subtitle     String?  // 推测(源站 prod.stx)
  description  String?  @db.Text
  price        Decimal  @db.Decimal(10, 2)  // USD 固定
  currency     String   @default("USD")
  stock        Int      @default(0)
  status       ProductStatus @default(ACTIVE)
  coverEmoji   String?  // 原站 .cover 用 emoji 占位
  coverUrl     String?  // /uploads/xxx.jpg(原站本地)
  categoryId   Int
  category     Category @relation(fields: [categoryId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  cartItems    CartItem[]
  orderItems   OrderItem[]
  reviews      Review[]

  @@index([categoryId, status])
  @@map("products")
}

enum ProductStatus { ACTIVE INACTIVE }
```

## 3. categories

```prisma
model Category {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  sort      Int       @default(0)
  status    CategoryStatus @default(ACTIVE)

  products  Product[]

  @@map("categories")
}

enum CategoryStatus { ACTIVE INACTIVE }
```

## 4. carts (购物车主表 + 明细)

源站 `/api/cart` 一次返回所有 line — 推测用主子表。

```prisma
model Cart {
  id        Int        @id @default(autoincrement())
  userId    Int
  user      User       @relation(fields: [userId], references: [id])
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  items     CartItem[]

  @@unique([userId])     // 一户一车
  @@map("carts")
}

model CartItem {
  id        Int     @id @default(autoincrement())
  cartId    Int
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  qty       Int     @default(1)
  addedAt   DateTime @default(now())

  @@unique([cartId, productId])
  @@map("cart_items")
}
```

## 5. orders (订单主表 + 明细)

```prisma
model Order {
  id            Int         @id @default(autoincrement())
  userId        Int
  user          User        @relation(fields: [userId], references: [id])
  status        OrderStatus @default(PENDING)
  subtotal      Decimal     @db.Decimal(10, 2)
  shippingFee   Decimal     @default(0) @db.Decimal(10, 2)
  total         Decimal     @db.Decimal(10, 2)
  shipName      String      // 推测(收件人)
  shipPhone     String
  shipCountry   String?
  shipState     String?
  shipCity      String
  shipPostal    String?
  shipDetail    String
  note          String?
  placedAt      DateTime    @default(now())
  paidAt        DateTime?
  shippedAt     DateTime?
  completedAt   DateTime?
  cancelledAt   DateTime?

  items         OrderItem[]

  @@index([userId, status])
  @@map("orders")
}

model OrderItem {
  id         Int     @id @default(autoincrement())
  orderId    Int
  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId  Int
  product    Product @relation(fields: [productId], references: [id])
  name       String  // 快照,防商品改名
  price      Decimal @db.Decimal(10, 2) // 快照
  qty        Int

  @@map("order_items")
}

enum OrderStatus { PENDING PAID SHIPPED COMPLETED CANCELLED }
```

**红线剔除**:
- ❌ `commissionAmount` `agentId` (佣金归属)
- ❌ `paymentMethod: USDT_TRC20` (加密支付)
- ❌ `txHash` (链上凭证)

## 6. addresses (收货地址簿)

```prisma
model Address {
  id          Int     @id @default(autoincrement())
  userId      Int
  user        User    @relation(fields: [userId], references: [id])
  shipName    String
  shipPhone   String
  shipCountry String?
  shipState   String?
  shipCity    String
  shipPostal  String?
  shipDetail  String
  isDefault   Boolean @default(false)

  @@index([userId])
  @@map("addresses")
}
```

## 7. reviews (商品评价)

```prisma
model Review {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id])
  productId  Int
  product    Product  @relation(fields: [productId], references: [id])
  rating     Int      // 1-5
  content    String   @db.Text
  createdAt  DateTime @default(now())

  @@unique([userId, productId])  // 一人一评
  @@map("reviews")
}
```

## 8. configs (单行 KV 配置)

```prisma
model Config {
  key       String   @id
  value     String   @db.Text  // JSON
  updatedAt DateTime @updatedAt

  @@map("configs")
}

// 已知 key:
// "home.hero"         → { title, subtitle, notice }
// "home.sub"          → "为每一次选择负责 · 官方直采 · 正品保障"
// "support.info"      → { telegram, email, wechat }
```

**红线剔除**:
- ❌ `withdraw.rules` (提现规则)
- ❌ `commission.rules` (佣金规则)
- ❌ `agent.config` (代理配置)

## 迁移建议(自己接入时)

```bash
# Prisma 迁移命令
npx prisma migrate dev --name init_peak_mall_public
npx prisma generate
```

初始 seed 见 `scripts/seed.ts`(TODO — 可选)。

## 已知差距(接入时要补的)

1. **支付表** — 源站用 USDT,合规版需对接 Stripe/Adyen,新增 `payments` 表
2. **物流表** — 源站发货字段简陋,合规版建议新增 `shipments` + `tracking_events`
3. **优惠券/促销** — 源站没有,合规版可加 `coupons` + `promotions` 表(可选)

详见 `biz-logic.md` 关于"源站 vs 法务安全建议"的对比。