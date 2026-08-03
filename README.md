# 今天吃什么 · 今日饭签

拿不定主意吃什么？投一签，帮你定今天的那一餐。

这是一个「替你做吃饭决策」的小工具。核心玩法是「今日饭签」——像水占卜一样投一签、抽中一道菜，
再顺手告诉你附近哪里能吃到；也提供「自己做」的次入口，翻一道开源菜谱直接看做法。
决策的副产品会记进本地「干饭日记」，长出「最懂你的风味」这类轻提醒，不打卡、不制造愧疚。

## 技术栈

- **Next.js 14**（App Router，`output: "standalone"`）+ **React 18**
- **TypeScript**
- **Tailwind CSS 3**
- **framer-motion**（水占 / 抽签动效）
- **Vitest**（纯逻辑单测）
- 店铺搜索经服务端 Route Handler 代理**高德地图 Web 服务 API**，key 只留在服务端
- 菜谱数据来自开源项目 **HowToCook**，构建期离线清洗成本地 JSON

## 环境变量

只有一个必需变量：高德 Web 服务 API Key。

```bash
# 复制样例并填入你自己的 key
cp .env.local.example .env.local
```

```dotenv
# .env.local
AMAP_KEY=你的高德_web_服务_key
```

- 申请：<https://lbs.amap.com> → 控制台 → 应用管理 → 创建应用 → 添加 Key（类型选「Web 服务」）。
- `AMAP_KEY` 只在服务端 `/api/shops` 使用，绝不下发浏览器。
- `.env.local` 已被 `.gitignore` 忽略，不会进版本库。
- 未配置 `AMAP_KEY` 时，应用可正常抽签，只是店铺搜索会返回配置错误提示。

## 本地启动

需要 Node.js 20。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

局域网 / 手机真机调试（用于定位等需要 HTTPS 的能力）：

```bash
npm run dev:lan          # 监听 0.0.0.0
npm run dev:lan:https    # 局域网 HTTPS（首次需 npm run cert:lan 生成本地证书）
```

## 测试 / 验证

```bash
npm run test         # vitest 监听模式
npm run test:run     # 跑一遍（CI 用）
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run lint:data    # 全库菜品数据 §7 硬门槛校验
npm run lint:mojibake# 源码乱码字符扫描
npm run verify       # 以上组合门（lint:mojibake → lint:data → test:run → typecheck → lint）
npm run build        # next build（standalone 产物）
npm run audit:ci     # 安全门：critical 零容忍 + 挡新引入的 high
```

CI（`.github/workflows/verify.yml`）在 push / PR 到 `main` 时依次跑 `verify` → `build` → `audit:ci`。

### 依赖安全说明

`npm run audit:ci` 的判定规则见 `scripts/audit-ci.mjs`：**任何 critical 一律失败**，
任何未登记的 high 也失败。已知、当前只能靠跨大版本升级消除的漏洞登记在脚本的 `BASELINE` 里，
既不让 CI 假绿、也不长期假红。

**当前安全状态（如实说明，勿理解为"已达完全上线安全"）：** 已把 Vitest 链升到 4.x，
消除了原先的 1 个 critical 及全部 vite/esbuild 相关（dev）漏洞；已建立 `audit:ci` 门禁并登记剩余风险。
但仍有 **已登记、未消除的漏洞**，其中包含 **生产依赖 Next.js 的 1 个 high + 1 个 moderate**
（另有 eslint-config-next 链路 3 个 high，属 dev 依赖）。这些均只能升级到
**Next 16 / eslint-config-next 16**（大版本、含破坏性变更）才能消除，本轮未盲升。

结论：**门禁已建立、剩余风险已登记，Next 生产依赖漏洞待「Next 16 升级」专项处理**。
升级完成后请重跑 `npm audit` 并据实清理 `BASELINE` 中已消除的条目。

## 部署（CloudBase 云托管 / Docker）

项目用多阶段 `Dockerfile` 构建 Next standalone 镜像（非 root 运行，监听 `PORT`，默认 3000）：

```bash
docker build -t eat-today .
docker run -p 3000:3000 -e AMAP_KEY=你的_key eat-today
```

腾讯云 CloudBase 云托管：配置见 `cloudbaserc.json`（`cloudrun.name` 为服务名）。
部署时在云托管环境变量里配置 `AMAP_KEY`。云托管把外部流量转发到容器 `PORT`，
`Dockerfile` 已按 standalone 约定拷贝 `server.js`、`.next/static` 与 `public`。

## 数据来源

- **菜谱数据**：来自开源项目 [Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook)（MIT License）。
  构建期由 `scripts/ingest-recipes.mjs` 离线 `git clone` 拉取、解析清洗，产出
  `src/config/datasets/recipes.generated.json`（带 MIT 署名），不进运行时、不打进客户端包。
- **店铺数据**：运行时经 `/api/shops` 代理高德地图 Web 服务 API 实时获取，仅做归一化与相关性过滤，不落库。
- **菜品候选库**：`src/config/foods.ts`，抽签候选池的结构化数据。
