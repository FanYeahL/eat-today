# eat-today — 项目全景与问题梳理（供 Codex 审阅）

> 本文档为**自包含**技术说明：阅读者无需额外上下文即可理解本项目的架构、数据流、核心算法与全部已知问题。
> 所有引用均标注 `文件路径:行号`，可直接跳转。
> 生成时间：2026-07-06。基线状态：`tsc --noEmit` ✅ 通过、`next lint` ✅ 零告警。

---

## 0. 一句话概括

「今天吃什么」决策工具。核心玩法 **今日饭签（水占）**：选餐段 + 口味 → 投签入水 → 抽出**一道菜**（附签文/吉位）→ 查**附近真实店铺**（高德 POI）。
另有一套已废弃但仍在仓库里的 **老虎机（两菜一饮）** 玩法（见 §6 孤儿代码）。

---

## 1. 技术栈与运行

| 项 | 值 |
|---|---|
| 框架 | Next.js **14.2.35**（App Router） |
| UI | React 18 + TypeScript(strict) + Tailwind 3.4 + framer-motion 12 |
| 外部依赖 | 高德开放平台 Web 服务 API（POI 搜索），需 `AMAP_KEY` 环境变量 |
| 部署 | Docker 多阶段（`Dockerfile`）+ `output: "standalone"`（`next.config.mjs`），目标腾讯 CloudBase 云托管（`cloudbaserc.json`，envId=`foodie-hub-...`） |
| 持久化 | 纯浏览器 `localStorage`，**无后端数据库** |
| 测试 | **无任何测试框架**（见问题 §7-P6） |
| 版本控制 | **当前目录非 git 仓库**（见问题 §7-P9） |

启动：`npm run dev`（默认 3000，被占则自增）。局域网/HTTPS：`npm run dev:lan` / `dev:lan:https`（`scripts/serve-lan.mjs`、`ensure-cert.mjs`）。

---

## 2. 路由与页面

| 路由 | 文件 | 说明 |
|---|---|---|
| `/` | `src/app/page.tsx` | **仅 8 行**，`export { default } from "./water-concept/page"`。落地页复用水占页面 |
| `/water-concept` | `src/app/water-concept/page.tsx` | **主页面，931 行**，水占三屏状态机（见 §4） |
| `GET /api/shops` | `src/app/api/shops/route.ts` | 高德 POI 代理，274 行（见 §5） |
| `GET /api/recipes` | `src/app/api/recipes/route.ts` | 按 id 查菜谱详情，长缓存 |

> ⚠️ `/` 和 `/water-concept` 现在渲染**完全相同**的组件（re-export）。这是最近一次改动的结果——把落地页从老虎机切成了水占，导致老虎机链路失去入口（§6）。

---

## 3. 目录结构（`src/`）

```
app/
  page.tsx                    # re-export water-concept
  water-concept/page.tsx      # 931 行主页面（水占状态机 + 内联子组件）
  layout.tsx / globals.css / fonts/
  api/shops/route.ts          # 高德代理（核心后端，274 行）
  api/recipes/route.ts        # 菜谱详情代理
components/
  common/                     # NeonButton / ShimmerFrame / WheelPicker
  features/
    water/                    # 【在用】水占 UI：WaterAmbience/RippleLayer/DivinationSlip/
                              #   DriftCards/WaterDiaryPanel/WaterRecipePanel
    roulette/                 # 【大部分孤儿】老虎机 UI：SlotMachine/Reel/ShopList/
                              #   RegularsHint/RegionSwitcher；仅 FunnelFilter/MealSwitcher/
                              #   CityPicker 仍被水占复用
    cook/                     # RecipeLibrary(在用,经WaterRecipePanel) / RecipeDetail /
                              #   CookMode(孤儿)
    social/                   # FriendFeed（孤儿）
hooks/
  useWaterDivination.ts       # 水占动画状态机（idle→casting→splash→revealing→revealed→exploring）
  useDivinationPick.ts        # 水占抽菜大脑（复用 pick-core）
  useRoulette.ts              # 【运行时孤儿】老虎机抽菜大脑（复用 pick-core）
  useShops.ts                 # 查店 hook（防串号请求）
  useRecipe.ts                # 查菜谱详情 hook
lib/
  pick-core.ts                # 【核心】抽取引擎：漏斗/加权/可用性门控（两 hook 共用）
  availability.ts             # 附近可用性缓存（按关键词，非按菜）
  geo.ts                      # 定位单例缓存 + 失败归因
  diary.ts                    # 干饭日记（localStorage: foodie:diary）
  regulars.ts                 # 常客熟悉度（localStorage: foodie:visits）
  pick-log.ts                 # 抽签埋点（localStorage: foodie:picklog）
  water-motion.ts             # 水占动画时序常量 TIMING
config/
  foods.ts                    # 【3083 行】食物数据库（主食+饮品），核心数据资产
  cuisine.ts / regions.ts / regions-cuisine.ts / meals.ts / divination.ts
  social-mock.ts              # 社交 mock（孤儿，随 FriendFeed）
  datasets/recipes.generated.json  # ~400KB 菜谱数据集（仅服务端加载）
types/
  food.d.ts                   # Food 及全部枚举（199 行，数据契约）
  shop.d.ts                   # Shop / ShopsResponse
```

---

## 4. 主页面数据流：水占（`water-concept/page.tsx`）

两个 hook 分工，**互不耦合**：

- `useWaterDivination`（`hooks/useWaterDivination.ts`）：**纯动画状态机**，管相位流转
  `idle → casting → splash → revealing → revealed → exploring`（`useWaterDivination.ts:24`）。
  相位推进由「动画 onComplete 回调 + 兜底计时器」双驱动，绝不卡死（`useWaterDivination.ts:82-107`）。
- `useDivinationPick`（`hooks/useDivinationPick.ts`）：**抽菜大脑**，产出「抽中哪道菜」。

一次「投签」的完整时序（`water-concept/page.tsx:118-127` `onCast`）：

```
用户点投签
  → div.cast(seen)              # 先抽菜（异步：定位 + 可用性门控），见下
  → 抽中 food 后 seenRef.add(food.id)
  → w.cast()                    # 才启动落水动画（保证签纸落下时已有菜）
  → 动画流转 splash→revealing→revealed
  → revealed 后可「再占」recastNow / 「探店」explore
```

`div.cast()` 内部（`useDivinationPick.ts:147-208`），过滤优先级**顺序有严格契约**：

```
mainFoodsByMeal(meal)           # 1. 按餐段取主食池
  → applyFamily(families)       # 2. family 硬墙（选西餐绝不出中餐）—— 必须最先
  → 去重(排除本轮 seen)          # 3. 硬约束；空了 = exhausted，提示换筛选，不硬抽重复
  → [有坐标] 最多 6 轮拒绝采样：  # 4. 可用性是「偏好」，不破坏去重
      prefilterByAvailability   #    排除已知附近没有的
      → pickOneMain(加权抽一道)  #    见下
      → unavailableKeywords     #    查它附近买不买得到，没有则拉黑重抽
  → [无坐标] 降级：直接加权抽，不按附近过滤
```

`pickOneMain`（`useDivinationPick.ts:61-83`）的权重乘积：
`regionWeight × budgetWeight × richnessWeight × moodWeight × (role===main ? 1.6) × familiarFactor × seedAvoidFactor`。

> 探店阶段：`useShops.fetchShops(keyword)` → `GET /api/shops`。`keyword` 来自 `keywordOf(pick)`（`availability.ts:25`），与门控同源。

---

## 5. 抽取引擎 `pick-core.ts`（两套玩法共用，单一数据源）

设计意图（`pick-core.ts:1-9`）：把「漏斗过滤 / 地区加权 / 加权抽样 / 综合加成 / 可用性预过滤/校验」这套与 UI 无关的纯逻辑抽出，老虎机与水占共用，修复不会两边漂移。

关键函数：

| 函数 | 行 | 作用 | 要点 |
|---|---|---|---|
| `regionWeight` | 44 | 地区加权 | 招牌菜 ×5，口味 tag 累乘；`all` 恒 1 |
| `applyFamily` | 65 | 风味家族**硬墙** | 顺序契约：必须在可用性/去重**之前**，否则会出「西餐+想吃好的→长沙臭豆腐」的 bug |
| `applyFunnel` | 81 | 漏斗（只硬过滤 family） | budget/mood 改为软权重，避免窄家族塌成单元素 |
| `budgetWeight` | 97 | 预算偏好乘子 | 选中档最高、相邻混入、远档压低不归零 |
| `richnessWeight` | 126 | 丰盛度乘子 | 治「想吃好的却抽出凯撒沙拉」：treat 档对轻食 ×0.15 |
| `moodWeight` | 136 | 心情乘子 | 匹配 ×1、不匹配 ×0.15（比预算更陡） |
| `pickBy` | 173 | 加权抽样 | 全 0/空池退回均匀随机（永不空池第二道防线） |
| `seedAvoidFactor` | 193 | 综合加成 | 种草 ×8 / 上轮 ×0.05 / 近 N 天 ×0.35 |
| `familiarFactor` | 211 | 常客熟悉度 | 取菜倍数与菜系倍数**较大值**（不相乘，避免双计） |
| `prefilterByAvailability` | 222 | 按缓存预过滤 | 排除已知不可用；空了退回原池 |
| `unavailableKeywords` | 235 | 校验可用性 | **串行**查（免费高德 key 并发 QPS 极低），配合缓存 |

### 5.1 可用性缓存 `availability.ts`
- 按**关键词**缓存，不按菜（`availability.ts:1-9`）：很多菜共享一个查店词（11 道零食都搜「便利店」），查一次整组都知道。
- 坐标量化成 ~1km 网格 key（`availability.ts:34`），走动几百米不失效、跨城重查。
- `checkKeyword`（`availability.ts:59`）网络出错时 **fail-open 返回 true**——宁可偶尔放过买不到的，也不因高德抽风把整池误判「附近都没有」。
- `keywordOf`（`availability.ts:25`）：优先 `food.shopKeyword`，否则回落**所属菜系的店类型词**（回锅肉→「川菜」），**绝不拿菜名硬搜**（菜名多半搜不到店招，会被误判永久踢出池）。

### 5.2 高德代理 `api/shops/route.ts`
- key 只在服务端（`route.ts:175`），绝不下发浏览器。✅
- **全局限流闸**（`route.ts:28-52`）：模块级 `gateChain` 把本进程所有高德请求串成一条链、相邻间隔 `MIN_GAP_MS=350`（≈2.8 QPS < 免费 key 3 QPS），根治 CUQPS 超限。
- **退避重试**（`route.ts:60-83`）：仅对 CUQPS 超限重试，带随机抖动打散惊群；额度/参数错误立即返回。
- **相关性过滤**（`route.ts:148`）：高德是模糊匹配（搜「牛肉粉」混进螺蛳粉），按 name/keytag/type 命中才算相关，杜绝 count 假阳性。
- **三种模式**：周边搜索（有经纬度）/ 城市搜索（无定位兜底）/ `count=1`（门控，只回数量）。
- **两层结果**：严格匹配 `shops` + 扩展推荐 `expansion`（同类店，前端按阈值展示），一次请求算出，零额外额度。

---

## 6. 🔴🔴 P0 — 数据库脏乱 + 筛选后抽取质量差（**最想解决、优先级最高**）

这是**产品体验的核心痛点**：数据库本身脏，加上筛选算法的软权重失效，导致「筛选后抽出来的东西很垃圾、达不到预期」。分两个互相叠加的根因。

### P0-A：食物数据库把「四种不同粒度的实体」混成一锅

数据源 `config/foods.ts`（3083 行，192 条），一个 `Food[]` 数组里塞了**四种本质不同的东西**，靠 `entityType` 字段标注（`types/food.d.ts:72-81` 已经承认了这个问题：「审计发现 foods 池里混了四种不同粒度的实体，先把事实标下来，再谈结构」）。实际分布：

| entityType | 数量 | 含义 | 真实例子（脏点所在） |
|---|---|---|---|
| `dish` | 141 | 具体菜品 | 黄焖鸡米饭、兰州牛肉面、蛋炒饭 ✅ 这才是「菜」 |
| `dining_style` | 21 | **用餐业态/形式** | 火锅、烧烤、韩式烤肉、串串香、自助烤肉 —— 是「怎么吃」不是「吃什么」 |
| `dish_group` | 17 | **菜品类别/泛指** | 炸鸡、披萨、汉堡、三明治、蛋糕 —— 是「一类」不是「一道」 |
| `brand` | 13 | **品牌/连锁店** | 肯德基、汉堡王、华莱士、杨国福麻辣烫、赛百味三明治 —— 是「店」不是「菜」 |

**为什么这会导致抽取很乱**：
- 用户期待「今天吃什么」抽出的是**一道具体的菜**（黄焖鸡米饭），结果可能抽到「肯德基」（一个品牌）、「火锅」（一种业态）、「炸鸡」（一个泛类）。这三者和「一道菜」根本不在一个决策层级上，混在同一个加权池里随机，体验必然错乱。
- 抽到「肯德基」时用户已经没有「决定吃什么」，只是「决定去哪家店」；抽到「火锅」时甚至还要再决定吃哪家火锅、点什么——**决策没有收敛，违背工具初衷**。
- `entityType` 字段目前**纯记录、不参与任何抽样/筛选逻辑**（`types/food.d.ts:78-80`、`pick-core.ts` 全文未读取它）——即「问题已被标注，但还没被治理」。
- 连**注释里的分组计数都已过期**：`foods.ts:12` 写「dish（108）」，实际 grep 到 141 条——数据在增长但注释没同步，是失管的又一佐证。

> 治理方向（供讨论，非结论）：要么把非 `dish` 实体从主抽签池剔除、只保留具体菜品参与「抽一道菜」；要么按 `entityType` 分层——先抽「吃哪类/哪种形式」，再在类内抽具体菜。`pick-log.ts`（埋点）注释（`pick-log.ts:1-15`）其实正是为「验证各 entityType 用户到底爱不爱、谁该进主抽签」而攒数据的——说明作者已意识到此事，只是决策还没落地。

### P0-B：筛选后权重失效——「想吃好的」却大概率抽到普通菜（**可量化的算法 bug**）

你的直觉「明明是普通消费水准，却出现在『吃点好的』这一档」**完全正确，而且可以用数字证明**。

根因在 `budgetWeight`（`pick-core.ts:97-108`）——预算是**软权重、不硬过滤**：

```
选 treat（想吃好的）时的乘子： treat=1.0, normal=0.5, budget=0.1
（richnessWeight 只额外惩罚「健康轻食/清淡」标签，不区分价位——见 pick-core.ts:126）
```

代入真实数据（treat 档仅 **23** 道，normal 档 **128** 道）：

| 档位 | 菜数 | 单道乘子 | **池内总权重** | 中签占比 |
|---|---|---|---|---|
| treat（想吃好的） | 23 | 1.0 | 23 | **约 23%** |
| normal（普通） | 128 | 0.5 | **64** | **约 63%** |
| budget（平价） | 41 | 0.1 | 4.1 | 约 4% |

→ **选了「想吃好的」，抽到普通菜的概率（63%）反而是抽到「好菜」（23%）的近 3 倍。** 这就是「筛选后抽取很垃圾」的数学根因：档位基数悬殊 + 软权重不归零，人多的档把人少的档淹没了。

雪上加霜的是 **treat 档本身也脏**（P0-A 的直接后果）——这 23 道「好的」里：

| treat 档 entityType | 数量 | 内容 |
|---|---|---|
| `dining_style` | 14 | 火锅/烤肉/串串/烤鱼（**业态占了 treat 档的 61%**） |
| `dish` | 9 | 黑椒牛排、鳗鱼饭、大盘鸡、麻辣小龙虾… |

→ 选「想吃好的」，即便命中了 treat 档，**六成以上抽到的是「火锅」「韩式烤肉」这种业态**，而不是一道能直接去吃的好菜。

**两个 bug 叠加的最终效果**：用户选「想吃好的」→ 大概率抽到普通菜（P0-B）→ 少数命中「好的」时又多半是个业态而非具体菜（P0-A）。体验双重崩坏。

> 治理方向（供讨论）：
> - **A. 预算改硬过滤或准硬过滤**：treat 档把 normal 乘子从 0.5 压到接近 0（如 0.05），或直接硬筛只留 treat±1 档，杜绝普通菜淹没。代价：treat 档只有 23 道、去掉业态后仅 9 道具体菜，池子会很小甚至塌（`applyFunnel` 注释 `pick-core.ts:71-79` 记录了作者当初正是**为了防塌池才改成软权重**的——所以这是个真实的取舍：先得把数据养厚/分层，硬过滤才立得住）。
> - **B. 按基数归一化**：让每档「总权重」相等而非「每道」相等，消除 128 vs 23 的基数碾压。
> - **C. 先治数据（P0-A）**：treat 档补足够多的**具体好菜**、把业态挪走，池子厚了硬过滤/归一都能用。
> P0-A 和 P0-B 是同一个病的两面，**建议一起治**：数据分层清理 + 权重策略重定。

---

## 7. 🔴 P1 — 孤儿代码（最近改路由的直接后果，**需先决策**）

把 `/` 从老虎机切成水占后，**老虎机整条链路已无任何路由可达**（`grep` 确认 0 文件 import `SlotMachine`）：

| 文件 | 行数 | 引用数 | 状态 |
|---|---|---|---|
| `components/features/roulette/SlotMachine.tsx` | 387 | **0** | 完全死代码 |
| `components/features/roulette/ShopList.tsx` | 231 | **0** | 完全死代码 |
| `components/features/roulette/RegularsHint.tsx` | — | **0** | 完全死代码 |
| `components/features/roulette/RegionSwitcher.tsx` | — | **0** | 完全死代码 |
| `components/features/roulette/Reel.tsx` | 91 | 1（仅被 SlotMachine） | 随之死 |
| `hooks/useRoulette.ts` | 360 | 运行时 0 | 仅剩 `Filters` 类型被 FunnelFilter import（`FunnelFilter.tsx:7`） |
| `components/features/social/FriendFeed.tsx` | 157 | **0** | 完全死代码 |
| `config/social-mock.ts` | 61 | 仅被 FriendFeed | 随之死 |
| `components/features/cook/CookMode.tsx` | 159 | **0** | 完全死代码 |

**仍在用**（被水占复用，勿删）：`roulette/{FunnelFilter,MealSwitcher,CityPicker}`、`cook/{RecipeLibrary,RecipeDetail}`（经 WaterRecipePanel）、`common/*`、全部 `water/*`。

> 注意一个耦合：`FunnelFilter.tsx:7` 从 `useRoulette` import 的是 **`Filters` 类型**（`useRoulette` re-export 自 `pick-core`）。若删 `useRoulette`，需把该 import 改指向 `@/lib/pick-core`。

**决策点**：
- 方案 A：删掉全部孤儿（约 **1300+ 行**，砍掉一半 features 代码），认知负担骤降。
- 方案 B：给老虎机重建 `/roulette` 路由入口，作为备用玩法保留。
- 现状（留在仓库但无入口）是最差的：既占维护成本又无人使用。

---

## 8. 其余问题清单

### 🟡 P2 — 两套抽菜 hook 的持久化逻辑重复
`useDivinationPick.ts:99-134` 与 `useRoulette.ts:140-172` **各自复制**了一份「从 localStorage 恢复 region/filters」的逻辑。
- 两者共用**相同的 key**（`foodie:region`/`foodie:filters`，见 `useDivinationPick.ts:43` 与 `useRoulette.ts:30`）——所以是**代码重复，不是数据冲突**（数据其实是打通的）。
- 若采纳 §7 方案 A 删掉 `useRoulette`，此重复自动消失。否则应抽一个共享的 `usePersistedFilters` hook。

### 🟡 P3 — 931 行单文件页面
`water-concept/page.tsx` 一个文件塞了：三屏状态机 + 多个内联子组件（文件尾部 891-931 仍有独立组件定义）。建议按屏（筛选屏 / 水占屏 / 探店屏）拆分为独立组件，主文件只做编排。

### 🟡 P4 — shops API 输入未校验 + 无鉴权
`api/shops/route.ts:183-198`：`lng`/`lat`/`keyword`/`city` 从 query 取出后**未校验**（经纬度是否合法数字/范围、keyword 长度）。这是唯一对外、且直接消耗高德**付费配额**的接口，且无任何鉴权/单 IP 限流（现有限流是保护高德 QPS 的**全局**闸，不防单一来源刷量）。建议：加参数校验 + 简单的单 IP/来源限流。

### 🟡 P5 — 持久化分散、无 schema 版本
5 处独立 localStorage key，各写各的容错，**无统一存储层、无版本号**：
| key | 文件 | 内容 |
|---|---|---|
| `foodie:region` | 两个 hook | 口味地区 |
| `foodie:filters` | 两个 hook | 漏斗筛选 |
| `foodie:diary` | `lib/diary.ts` | 干饭日记（结构化） |
| `foodie:visits` | `lib/regulars.ts` | 常客熟悉度 |
| `foodie:picklog` | `lib/pick-log.ts` | 抽签埋点 |
未来改数据结构会静默丢数据。建议统一为带版本号的存储层，集中做迁移与容错。

### 🟡 P6 — 零测试
`pick-core.ts`（加权抽样、可用性门控、顺序契约）、`availability.ts`（缓存 + fail-open）、`geo.ts`（单例 + 归因）是纯逻辑、最该被单测锁住，尤其 `applyFamily` 的顺序契约（`pick-core.ts:56-64` 注释记录了曾出的真实 bug）。**当前零覆盖**。建议引入 Vitest，优先覆盖上述纯函数。

### 🟢 P7 — README 是脚手架默认内容
`README.md` 仍是 `create-next-app` 模板：写着「edit app/page.tsx」、端口 3000、Vercel 部署——与真实项目（水占主页、CloudBase 部署、需 `AMAP_KEY`）完全脱节，会误导阅读者。

### 🟢 P8 — `.DS_Store` 入仓
根目录与 `src/` 各有一个 `.DS_Store`。`.gitignore` 虽已忽略，但既有文件需清除。

### 🟢 P9 — 非 git 仓库
`git rev-parse` 报错，目录未初始化版本控制。若要协作/交付，应先 `git init`。

---

## 9. 建议优先级

| # | 动作 | 收益 | 风险 |
|---|---|---|---|
| **0** | **治数据 + 重定权重策略（§6 P0-A + P0-B）** | **直击核心痛点：让「筛选后抽取」符合预期** | 中（需数据分层 + 算法取舍，最好先有 P6 测试兜底） |
| 1 | `git init` + 清 `.DS_Store` + 重写 README（§8 P7/P8/P9） | 可交付、他人可读 | 无 |
| 2 | **决策孤儿代码去留**（§7 P1），删或建 `/roulette` 入口 | 砍 ~1300 行 / 认知负担减半 | 删代码不可逆，需确认 |
| 3 | shops API 加输入校验 + 单来源限流（§8 P4） | 保护高德付费配额 | 低 |
| 4 | 拆分 931 行 `page.tsx`（§8 P3） | 可维护性 | 中（回归风险，需 P6 兜底） |
| 5 | 引入 Vitest，覆盖 pick-core/availability/geo（§8 P6） | 锁住核心逻辑 | 无 |
| 6 | 统一带版本的 localStorage 存储层（§8 P5） | 防数据迁移事故 | 低 |

> 建议顺序：先做 1、2（清理）+ 5（补测试兜底），再做 **0**（治数据/权重，核心痛点，靠 5 兜底），最后 3、4、6。
> **P0 是你最想解决的问题，收益最高但需要数据侧和算法侧一起动，务必先有测试再改权重。**
