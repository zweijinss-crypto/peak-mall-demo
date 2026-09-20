# ref-peak-mall/ i18n screenshots

`/ref-peak-mall` demo 的 zh / en 双语视觉验收截图。
全部 1280×800 viewport,full page。

| # | File | Lang | Mode | 验收重点 |
|---|---|---|---|---|
| 01 | `01-zh-shop.png` | zh | 商城 | Hero / 推荐商品 / 分类条 / 双 banner / cart demo / about |
| 02 | `02-en-shop.png` | en | 商城 | 全部 UI 切英文,商品卡 6 件 + cart 2 行都换名 |
| 03 | `03-en-auth.png` | en | 登录/注册 | 双表单,无「邀请码」字段 |
| 04 | `04-zh-auth.png` | zh | 登录/注册 | 中英对照版 |

`thumbs/` 是 400px 缩略图,适合 README 内嵌用。

## 红线 (cross-language)

- 邀请码字段 → **0**(en + zh 双侧都不存在)
- payment / USDT / 分销 / 提现 / 佣金 → **0**(任何语言)
- 占位符泄漏 (`__COPY_` / `TODO` / `FIXME` / `[COPY:`) → **0**
- zh → en 切换时,zh 字符串残留(ref demo 范围内)→ **0**
- LangSwitcher 的「中」按钮 → 故意保留为中文(按钮本身是切换到中文的入口)
- 全局 CookieBanner 是主站 zh-only 组件,不跟 ref demo 的 lang 切换

## 重跑脚本

```bash
cd /Users/bz/Projects/peak-mall-demo
node /tmp/ref-i18n-shots.mjs        # 4 张截图
node /tmp/ref-final-verify.mjs      # 分类 i18n 验证
node /tmp/ref-en-no-zh.mjs          # EN 模式 zh 残留 (主测试)
node /tmp/ref-zh-clean.mjs          # 排除 LangSwitcher 后的 zh 清理验证
```

## 字典位置

`src/lib/ref-translations.tsx` —— 单一双语来源,zh + en 平铺。