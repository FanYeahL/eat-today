# eat-today 数据库重建 · 可执行规格（Phase 1）

> 目标：**先把默认抽签结果变干净、稳定、具体**。UI 不大改，shops API 不做阻塞式重构。
> 状态：待 user + Codex 审阅后执行。生成于 2026-07-06。
> 拍板边界（已确认）：family 推导不存 · 新菜走结构化草案先审 · dining_style 暂不改名 · shops API 兼容现状 · 默认池 = `kind==="main" && entityType==="dish"`。

---

## 0. 本阶段做 / 不做

**做：**
- 扩展 `Dish` 数据模型（新增 satiety/indulgence/convenience/occasion/search/canonicalGroup 等字段）。
- 补 129 道具体菜，填满缺口矩阵（§4）。
- 重写预算抽取策略为「价位桶抽样 + 桶内加权」（§5），含空桶 fallback（§6）。
- 新增数据 lint 脚本（§7）+ 抽取单测（§8）。

**不做（推迟到 Phase 2）：**
- ❌ 不重命名 `dining_style → experience`（代码层保留 `EntityType` 现值，仅在默认池排除它）。
- ❌ 不重构 shops API 的 gateQuery/displayQuery（search profile 先设计、数据先填，运行时仍走现有 `shopKeyword`/`cuisineKeyword`）。
- ❌ 不改水占三屏 UI 结构、不动老虎机去留（另案）。

---

## 1. 新数据模型

### 1.1 Food / Dish 字段（`src/types/food.d.ts`）

在现有 `Food` 上**新增**以下字段。`family` **不新增字段**——继续由 `familyOf(cuisine)` 推导（单一数据源，防漂移）。

```ts
export interface Food extends ReelItem {
  // ——— 现有字段全部保留 ———
  kind: FoodKind;               // "main" | "drink"
  entityType: EntityType;       // "dish" | "dish_group" | "dining_style" | "brand"（本阶段不改名）
  cuisine: CuisineKey;
  role: FoodRole;               // "main" | "snack"
  priceTier: PriceTier;         // "budget" | "normal" | "treat"
  spicy: SpicyLevel;            // 0..3
  tags: FoodTag[];
  meals: MealType[];
  recommend: RecommendLevel;    // 1..5
  regions?: RegionKey[];
  shopKeyword?: string;         // 【保留】Phase 1 查店仍用它，见 §2
  description?: string;

  // ——— Phase 1 新增（dish 必填；drink 见 1.3）———
  satiety: SatietyLevel;        // 1..5 顶不顶饱
  indulgence: IndulgenceLevel;  // 1..5 犒劳感 / 丰盛度
  convenience: Convenience;     // 主要获取方式
  occasion: Occasion[];         // 适合场景（可多）
  pickLayer: PickLayer;         // ★决策层级：meal=一顿饭级别(进默认单菜池) / side=小食配菜(不进)
  search: SearchProfile;        // 查店档案，见 §2（Phase 1 仅数据，不驱动运行时）
  canonicalGroup?: string;      // 归一族，防相似菜连续刷屏，见 §5.4
  aliases?: string[];           // 别名（查店/搜索扩展用，Phase 1 仅数据）
  recipeIds?: string[];         // 关联菜谱 id（可选）
}

export type SatietyLevel = 1 | 2 | 3 | 4 | 5;
export type IndulgenceLevel = 1 | 2 | 3 | 4 | 5;
export type Convenience =
  | "canteen"       // 食堂
  | "takeout"       // 外卖为主
  | "restaurant"    // 需堂食/餐厅
  | "convenience"   // 便利店即取
  | "dorm";         // 宿舍可自制
export type Occasion = "solo" | "date" | "friends" | "lateNight" | "quick";

/**
 * 决策层级——把「一顿饭级别的具体食物」与「小食/配菜/组合项」分开，
 * 让默认单菜抽签只出真正能当一餐的东西（对齐 user「默认池只出一顿饭级别的具体食物」）。
 * - "meal"：satiety>=3，一道能当一餐主角（进默认单菜池）。
 * - "side"：satiety<3，凉菜/小食/配菜/汤水，需搭配或组合（不进默认单菜池，进 side 集合）。
 * 数据里显式写死（不再靠运行时用 satiety 推导），保证 lint 与落库口径单一。
 */
export type PickLayer = "meal" | "side";

export interface SearchProfile {
  gateQuery: string;          // 「附近有没有这类店」——门控用（Phase 1 = 现 keywordOf 结果）
  displayQuery: string;       // 「展示店铺时搜什么」（Phase 1 = shopKeyword ?? name）
  fallbackQueries: string[];  // 兜底关键词（Phase 1 仅存，不启用）
}
```

> `family` 访问方式不变：`familyOf(food.cuisine)`。任何需要 family 的地方一律走它，禁止在数据里写死。

### 1.2 决策实体分层（概念层，非本阶段的类型改名）

产品语义上分四层，但 Phase 1 **只在抽取层用 `entityType` 区分**，不改类型名：

| 概念层 | 现 `entityType` 值 | Phase 1 处理 |
|---|---|---|
| 具体菜 | `"dish"` | **唯一进默认抽签池** |
| 用餐方式（火锅/烧烤，产品名 experience） | `"dining_style"` | 排除出默认池，留作二级集合 |
| 泛类（披萨/炸鸡） | `"dish_group"` | 排除出默认池 |
| 品牌/店（肯德基） | `"brand"` | 排除出默认池 |

### 1.3 drink 的新字段策略
饮品/甜点（`kind==="drink"`）：`satiety` 固定填 `1`，`indulgence` 按实际（奶茶/蛋糕可 3-4），`convenience` 多为 `convenience`/`takeout`，`occasion` 据实，`pickLayer` 恒为 `"side"`（饮品/甜点天然不是「一餐主角」，与 satiety<3 一致）。`search` 仍填（gateQuery 多为「奶茶店」「便利店」类）。饮品不参与主食价位桶抽样，沿用现有轴3共振逻辑。

---

## 2. search profile 与 shops API 的兼容策略（额外要求 B）

Phase 1 **不改 shops API、不改 `availability.keywordOf`**。运行时查店仍是：

```
keywordOf(food) = food.shopKeyword ?? cuisineKeyword(food.cuisine)   // 现状，不动
```

新增的 `search` 字段本阶段**只作为数据存在**，填充规则（供未来 Phase 2 切换）：

- `gateQuery` ← 填当前 `keywordOf(food)` 的等价值（即 `shopKeyword ?? 菜系店类型词`）。
- `displayQuery` ← 填 `shopKeyword ?? name`。
- `fallbackQueries` ← 相关店类型词数组（如川菜 dish 填 `["川菜","家常菜","中餐"]`）。

> 迁移开关（Phase 2）：把 `keywordOf` 改读 `food.search.gateQuery`，shops API 展示改读 `displayQuery`、门控放宽改用 `fallbackQueries`。Phase 1 保证「数据已就绪、运行时零改动」，互不阻塞。

---

## 3. 默认抽签池规则（额外要求 D）

单一入口函数，全项目复用（放 `src/config/foods.ts` 或 `pick-core.ts`）：

```ts
/** 默认主抽签池：只有「一顿饭级别的具体菜」进池 */
export function isDefaultPickable(f: Food): boolean {
  return f.kind === "main" && f.entityType === "dish" && f.pickLayer === "meal";
}

/** 按餐段取默认池（替换现 mainFoodsByMeal 的实现内核） */
export function mainFoodsByMeal(meal: MealType): Food[] {
  return foods.filter((f) => isDefaultPickable(f) && f.meals.includes(meal));
}

/** side 集合：小食/配菜/组合项，供组合推荐/加菜用，不进默认单菜抽签 */
export function sideFoods(meal?: MealType): Food[] {
  return foods.filter(
    (f) => f.kind === "main" && f.entityType === "dish" && f.pickLayer === "side"
      && (meal ? f.meals.includes(meal) : true),
  );
}
```

- `brand` / `dining_style` / `dish_group` **一律不进默认抽签**。
- `pickLayer === "side"`（satiety<3 的凉菜/小食/配菜）**也不进默认单菜池**——即便它是 `kind:"main", entityType:"dish"`。这是本次新增的第三道门，防止「茶叶蛋/皮蛋豆腐」这类被当成一餐主角抽出。
- 二级集合（火锅/品牌等）通过独立 selector 暴露，不走 `mainFoodsByMeal`（Phase 1 可先不接 UI，数据留存即可）。
- `mainFoodsByMeal` 是现有 `useDivinationPick` / `useRoulette` 的共同入口（`useDivinationPick.ts:149`），改其内核即全链路生效，无需动 hook。

---

## 4. 新菜补齐矩阵（目标 & 缺口）

> ⚠️ **口径 = meal 层 only**。缺口矩阵只统计 `pickLayer === "meal"` 的 dish（默认单菜池的真实供给）。
> `side` 层（satiety<3）单独另计（见 §4.1），**绝不计入下列 meal 缺口**——否则会误以为池子补够、实际早餐/宵夜仍薄。

dish（meal 层）目标 ≈237（满足 240 量级）。各格 = 目标(补齐数)。详见 `dish-candidates.draft.json`。

| family | budget | normal | treat | 合计 |
|---|---|---|---|---|
| chinese | 35 (+18) | 65 (+22) | 14 (+9) | 114 |
| western | 10 (+8) | 22 (+13) | 9 (+8) | 41 |
| jpkr | 10 (+7) | 24 (+13) | 9 (+7) | 43 |
| exotic | 10 (+4) | 20 (+12) | 9 (+8) | 39 |
| **补齐合计** | +37 | +60 | +32 | **+129** |

> 注：以上 +129 为 **meal 层**目标。中式第一批实际产出 = **meal 42 + side 7 = 49 行**，其中**只有 42 计入 meal 缺口**（budget/normal/treat 的 meal 计数见 review 表），side 7 计入 §4.1。因此中式 meal 层仍差 **+7**（budget 层被 side 占用最多），后续批次或补录时需补齐。

**餐段最低标准（dish **meal 层** 主食，去重按餐段命中）与当前缺口：**

> 口径 = meal 层 only（`pickLayer==="meal"`）。side 层不计入下表。

| 餐段 | 现状 | 目标 | 缺口 | 补齐重点 |
|---|---|---|---|---|
| 早餐 breakfast | 29 | 40 | +11 | 中式早点、便利店速食（须 satiety≥3 才算 meal） |
| 午饭 lunch | 75 | 120 | +45 | 各家族盖饭/面/正餐 |
| 下午茶 tea | 34 | 50 | +16 | 轻食、小食、甜点向（多为 side 层，见 §4.1） |
| 晚饭 dinner | 79 | 140 | +61 | 正餐主力，treat 集中在此 |
| 宵夜 midnight | 33 | 70 | +37 | 面/粥/烧烤替代的具体菜、便利店 |

### 4.1 side 层单独指标（不并入 meal 缺口）

`side`（satiety<3：凉菜/小食/配菜/汤水/早点小件）单独计量，服务于「组合推荐 / 加个菜」，**不进默认单菜池**，因此**不计入 §4 与上表的 meal 缺口**。

- 中式第一批 side 产出 = **7**：白粥配小菜 / 茶叶蛋 / 咸豆浆 / 上海小馄饨 / 皮蛋豆腐 / 卤味拼盘 / 夫妻肺片。
- side 层目标暂不设硬门槛（Phase 1 先积累），落库后按 `sideFoods()` 归入 side 集合。
- ⚠️ 审查提示：本批 side 多为早餐/宵夜小件，意味着**早餐/宵夜的 meal 层供给比行数看起来更薄**——早餐 meal 命中仅 3、宵夜仅 2（见 review 表），远低于目标，须在后续批次专门补「顶饱的早餐/宵夜正餐」。

**treat 补齐硬性要求（额外要求 F）**：treat 档新菜必须是**高 indulgence(≥4)、高 satiety(≥3)、非「健康轻食」**的具体菜，禁止用 dining_style 凑数。
> 注意：treat 门**不惩罚「清淡」**——「清淡」只是口味，不代表不犒劳（白灼基围虾清淡但高质量）。只看 indulgence / satiety / 是否「健康轻食」。详见 §5.3。
参考清单（已纳入草案）：
- 中式：毛血旺、酸汤肥牛、椒麻鱼片、蟹黄豆腐、葱烧海参、水煮牛肉、干锅牛蛙…
- 西餐：惠灵顿牛排、奶油蘑菇牛排饭、海鲜意面、香煎鸡排饭、芝士焗饭…
- 日韩：鳗鱼饭、寿喜烧牛肉饭、韩式牛排拌饭、刺身盖饭、参鸡汤…
- 异国：咖喱羊肉饭、冬阴功海鲜粉、越南牛肉河粉、土耳其烤肉饭…

---

## 5. 抽取策略：价位桶抽样（额外要求 E）

### 5.1 插入顺序（严格契约）
```
mainFoodsByMeal(meal)        # 1. 餐段过滤（内含 isDefaultPickable → 已保证 dish）
  → applyFamily(families)    # 2. family 硬墙
  → (已是 dish)              # 3. entityType=dish（由 §3 入口保证，无需再滤）
  → 去重(排除 seen)          # 4. seen 硬约束；空 = exhausted
  → 按价位桶抽 bucket        # 5. ★新增：先按 budgetBucketMix 抽出目标价位桶
  → 桶内加权抽一道           # 6. 桶内按 region/mood/indulgence/常客/避重 加权
  → 可用性门控               # 7. 校验附近买得到，不可用则桶内重抽（保持在同桶/同池）
```
> 与现有顺序契约的关系：`applyFamily` 仍最先（`pick-core.ts:56-64` 的顺序 bug 不复现）；桶抽样插在「去重之后、可用性之前」，可用性门控在**选定桶内**做重抽，不跨桶跨 family。

### 5.2 价位桶混合比（budgetBucketMix）
```ts
const budgetBucketMix: Record<Filters["budget"], Record<PriceTier, number>> = {
  any:    { budget: 0.34, normal: 0.5,  treat: 0.16 }, // 不选预算时的自然分布
  budget: { budget: 0.7,  normal: 0.3,  treat: 0    },
  normal: { budget: 0.15, normal: 0.7,  treat: 0.15 },
  treat:  { budget: 0,    normal: 0.25, treat: 0.75 },
};
```
> `any` 档为新增（现无「先抽桶」概念）；比例贴近数据自然构成，保证不选预算时行为稳定。

### 5.3 桶内加权（treat 桶的 indulgence 提权，额外要求 F）
桶选定后，在**桶内 unseen 池**按现有权重乘积抽样，并叠加：
```
w = regionWeight × moodWeight × (role===main?1.6) × familiarFactor × seedAvoidFactor
  × indulgenceWeight(food, bucket)      // ★新增
```
- `indulgenceWeight`：仅 `treat` 桶生效——`indulgence>=4 → ×1.8`；`indulgence<=2 或 satiety<3 或含「健康轻食」→ ×0.2`。budget/normal 桶恒 1。
- ⚠️ **不惩罚「清淡」**：清淡是口味、非"不犒劳"的信号。白灼基围虾（清淡、indulgence 4、satiety 3）应留在 treat 桶正常权重。只有「健康轻食」标签或低 indulgence/satiety 才降权。（与生成器 treat 质量门口径一致：`gen-dish-candidates.mjs` §自检、`draft._meta.notes`。）
- **移除** `budgetWeight` / `richnessWeight` 的 per-dish 软权重（其职责被「桶抽样 + indulgenceWeight」取代），`moodWeight` 保留。

### 5.4 canonicalGroup 防刷屏
连占时，已见过的菜若与候选**同 canonicalGroup**，候选权重 ×0.15（软避，非硬排）。避免「麻辣小龙虾 / 蒜香小龙虾 / 十三香小龙虾」连续出现。seen 仍按 id 精确去重，canonicalGroup 是额外的相似度软避。

---

## 6. 空桶 fallback 规则（额外要求 E）

抽桶时，若命中的目标桶在**当前 family∩meal∩dish∩unseen 池**内为空：

1. **只在当前池内**把该空桶的概率质量，按 mix 里其余**非空**桶的相对比例重新分配。
2. 绝不回退到全库、绝不跨 family、绝不放宽到 non-dish。
3. 若整个池（所有桶）都空 → 上抛 `exhausted`（交 UI 提示换筛选，同现有 A 方案），不硬抽重复。

示例：选 `treat`（mix `{budget:0, normal:0.25, treat:0.75}`），但当前池 treat 桶空、normal/budget 非空：
- 归一非空桶：normal:0.25 → 重分为 normal:1.0（budget 原本就 0）。即退化为「全抽 normal 桶」。
- 若 normal 也空、只剩 budget：抽 budget。
- 三桶全空 → exhausted。

```ts
function resolveBucket(mix: Record<PriceTier, number>, nonEmpty: Set<PriceTier>): PriceTier | null {
  const active = (["budget","normal","treat"] as PriceTier[])
    .filter((t) => nonEmpty.has(t) && mix[t] > 0);
  if (active.length === 0) {
    // mix 里有权重的桶都空了：放宽到「任何非空桶均匀」，仍限本池内
    const any = [...nonEmpty];
    return any.length ? any[Math.floor(Math.random()*any.length)] : null; // null → exhausted
  }
  const total = active.reduce((s,t)=>s+mix[t],0);
  let r = Math.random()*total;
  for (const t of active){ r -= mix[t]; if (r<=0) return t; }
  return active[active.length-1];
}
```

---

## 7. 数据 lint 规则（脚本 `scripts/lint-foods.mjs`，CI/pre-build 可跑）

失败即非零退出。规则：

1. **默认池纯净**：`mainFoodsByMeal` 结果必须全部满足 `kind==="main" && entityType==="dish" && pickLayer==="meal"`；`brand/dining_style/dish_group` 及 `pickLayer==="side"` 一律不得出现。
2. **dish 必填字段**：每个 `dish` 必须有 `cuisine / priceTier / meals(非空) / tags(非空) / satiety / indulgence / convenience / occasion(非空) / pickLayer / search.gateQuery / search.displayQuery`。
3. **枚举合法**：`cuisine/priceTier/spicy/satiety/indulgence/convenience/occasion/tags/meals/pickLayer` 全部落在类型允许值内（防手写拼错）。
4. **pickLayer 与 satiety 一致**：`pickLayer==="meal"` ⟺ `satiety>=3`；`pickLayer==="side"` ⟺ `satiety<3`（口径单一，防两处漂移）。
5. **餐段够量**（dish **meal 层**，按餐段命中计，side 不计）：早≥40 / 午≥120 / 茶≥50 / 晚≥140 / 宵≥70。
6. **family×price 不塌**（仅 meal 层）：每个 family 的每个 priceTier 桶，meal-dish 数 ≥ 阈值（budget≥8, normal≥15, treat≥8）。
7. **treat 质量门**：每个 `treat` 且 `pickLayer==="meal"` 的 dish 必须 `indulgence>=4 && satiety>=3` 且 tags 不含「健康轻食」（**不检查「清淡」**）。
8. **id 唯一**；**canonicalGroup 若存在，组内 cuisine 一致**。
9. **每家族每餐段非空**（meal 层）：4 family × 5 meal = 20 格，每格 meal-dish 数 ≥3（防「选西餐+早餐」塌池）。
10. **无乱码**：任何字符串字段不得含 U+FFFD（`�`）。

---

## 8. 验证（交付前必过）

- `npx tsc --noEmit` ✅
- `npx next lint` ✅
- `node scripts/lint-foods.mjs` ✅（§7 全过）
- **新增单测**（引入 Vitest）：
  - `pick-core` 桶抽样：给定 mix + 池，统计 10k 次抽样，treat 档 treat 桶命中率落在 0.7±0.05。
  - 空桶 fallback：treat 桶空时，结果全部来自 normal/budget，且不越 family。
  - `isDefaultPickable`：brand/dining_style/dish_group 一律 false。
  - canonicalGroup 软避：连占同组出现率显著低于跨组。
  - 顺序契约回归：`applyFamily` 仍在最前（西餐+treat 不出中餐菜）。

---

## 9. 分阶段实现顺序

| 步 | 内容 | 产物 | 依赖 |
|---|---|---|---|
| S0 | **审候选菜单**（user+Codex 审 `dish-candidates.draft.json`） | 定稿菜单 | 本规格 |
| S1 | 扩展 `types/food.d.ts`（§1 新字段 + 枚举） | 类型就绪 | — |
| S2 | 给**存量 108 dish** 补新字段（satiety/indulgence/convenience/occasion/search）；标注 canonicalGroup | 存量迁移完 | S1 |
| S3 | 把定稿新菜（129 道）写入 `foods.ts`，字段齐全 | 数据达标 | S0,S1 |
| S4 | 加 `isDefaultPickable` + 改 `mainFoodsByMeal` 内核（§3） | 默认池纯净 | S1 |
| S5 | `pick-core` 加桶抽样 + resolveBucket + indulgenceWeight + canonicalGroup 软避；移除旧 budget/richness 软权重（§5,6） | 抽取策略新 | S4 |
| S6 | 写 `scripts/lint-foods.mjs`（§7）；引入 Vitest + 单测（§8） | 验证就位 | S2-S5 |
| S7 | 跑 §8 全部验证，修红 | 绿 | S6 |

> **S2 与 S3 是最大工作量**（存量迁移 + 新菜落库），但都是纯数据、低风险，可并行分块。S4/S5 是核心逻辑改动，必须有 S6 的测试兜底后再 merge。
> UI 零改动（额外要求 A）：全部改动收敛在 types / config / lib / scripts，`water-concept/page.tsx` 与各组件不动。
