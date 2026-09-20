# Netlify 部署记录

## ✅ 已部署

- **Production URL**: https://peak-mall-demo.netlify.app
- **Admin**: https://app.netlify.com/projects/peak-mall-demo
- **Site ID**: `c80ec344-e4a4-4b8c-ab13-b1300afe4330`
- **Team**: `analgor`
- **Deploy 时间**: 24.8s,上传 83 文件
- **Build 命令**: `npm run build`(netlify.toml)
- **Publish 目录**: `out/`
- **HEAD commit**: `019e45d`

## 🔴 Edge Access 锁站(待手动解除)

curl 部署 URL 返回 **HTTP 401** (Login Redirect → app.netlify.com/edge-access)。
锁是 team / account 级,CLI 无法直接解除。

### 解锁步骤(浏览器手动,1 分钟)

1. 打开 https://app.netlify.com/projects/peak-mall-demo/configuration/access
2. 关闭 **Visitor access** 开关(默认 team 全员 enabled)
3. 等 ~30s 生效,curl 重新测试:
   ```bash
   curl -sL -o /tmp/check.txt -w "HTTP %{http_code}\n" \
     https://peak-mall-demo.netlify.app/ref-peak-mall
   # 期望: HTTP 200
   ```

或者更简单 — 浏览器直接访问一次,Netlify 会把 user 加 allowlist(但这是 team 锁,allowlist 仍要求登录)。

## 验收 checklist(解锁后跑)

```bash
curl -sL -o /tmp/ref.html -w "HTTP %{http_code}\n" \
  https://peak-mall-demo.netlify.app/ref-peak-mall
grep -oE "(全球精选|推荐商品|加入购物车|新用户注册即享|小计)" /tmp/ref.html
# 期望: 5 行全部命中
```

## Lighthouse 线上 (解锁后跑)

```bash
cd /tmp/lh && ./node_modules/.bin/lighthouse \
  https://peak-mall-demo.netlify.app/ref-peak-mall \
  --preset=desktop \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --output=html --output-path=./prod-live.html
```

## 重部署命令

```bash
cd /Users/bz/Projects/peak-mall-demo
git add . && git commit -m "..." # 任意改动
netlify deploy --dir=out --prod  # 部署 out/ 目录
```

不需要 build — `out/` 已经在 git tree 之外,但每次部署前建议跑:
```bash
rm -rf out && pnpm build && netlify deploy --dir=out --prod
```

## netlify.toml 配置要点

```toml
[build]
  command = "npm run build"   # 用 pnpm install + npm run build(lockfile 兼容)
  publish = "out"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"
```

`output: 'export'` 已配 next.config.js,所有路由预渲染为静态 HTML。

## 环境变量

无 — peak-mall-demo 不依赖外部 API(全本地 mock)。
dbto-ai 的 ARK_API_KEY 等不适用。