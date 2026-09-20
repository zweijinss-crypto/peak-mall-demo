# 主站 UI 优化 — before/after 对比

`ui: 主站 4 项视觉优化` 之前 / 之后截图 (1440x900 viewport, full page)。

| # | File | 说明 |
|---|---|---|
| 01-home.png | 主页 (before) | Hero + 推荐 + 看了又看 + 分类 |
| 02-shop-detail.png | 商品详情 (before) | 缩略图 + 价格 + 加入购物车 |
| 03-cart.png | 购物车 (before) | 空态演示 |
| 04-profile.png | 我的 (before) | 订单/收藏/设置 |
| 05-home-after.png | 主页 (after) | 同上 |
| 06-shop-detail-after.png | 商品详情 (after) | |
| 07-cart-after.png | 购物车 (after) | |
| 08-profile-after.png | 我的 (after) | |

## 4 项改动

1. **ProductCard title**: 13.5px → 14.5px (舒适度)
2. **Footer h3 → h4**: a11y heading-order (5 个列标题)
3. **Lang switcher**: 6px 圆角 → 8px + active gradient 立体
4. **Body bg**: 冷蓝灰 → 暖白 (#f7f8fa → #fafaf7)

## Diff stat

```
 src/app/globals.css                    |  2 +-
 src/components/peak-mall/Footer.tsx    |  6 +++---
 src/components/peak-mall/ProductCard.tsx |  2 +-
 src/components/peak-mall/ShopHeader.tsx |  8 ++++----
 4 files changed, 9 insertions(+), 9 deletions(-)
```