# eat-today 数据库重建 · 可执行规格（Phase 1）

> 目标：**先把默认抽签结果变干净、稳定、具体**。UI 不大改，shops API 不做阻塞式重构。
> 状态：待 user + Codex 审阅后执行。生成于 2026-07-06。
> 拍板边界（已确认）：family 推导不存 · 新菜走结构化草案先审 · dining_style 暂不改名 · shops API 兼容现状 · 默认池 = `kind==="main" && entityType==="dish" && pickLayer==="meal"`。

---

## 0. 本阶段做 / 不做

**做：**
- 扩展 `Dish` 数据模型（新增 satiety/indulgence/convenience/occasion/search/canonicalGroup 等字段）。
- 补 **129 个 meal-layer dish**（`pickLayer==="meal"`）填满缺口矩阵（§4）；side 层为额外产出，不占配额、不按行数收尾。
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

### 2.1 ⚠️ 落库时的 shopKeyword 决策（防"附近可用性偏虚"）

Phase 1 运行时查店仍是 `keywordOf = shopKeyword ?? cuisineKeyword(cuisine)`。候选草案**已按 A 变体生成部分 `shopKeyword`**（回退过宽/含专门店型品类的菜才补，见下）。若把回退过宽的新菜落库又不补 `shopKeyword`，则查店会退回到宽泛的菜系词（"家常菜/西餐厅/异国料理"），availability 门控会**偏虚**（几乎总是"附近有"，失去筛掉冷门菜的意义）。

> ✅ **已定稿（方案 A 变体，user 拍板）**：只给"回退词过宽/不准"的菜补 `shopKeyword`（**店型/品类词，不是菜名**）；中式细分菜系走 `cuisineKeyword` 不补。已在 `gen-dish-candidates.mjs` 落实（`SHOP_KEYWORD` 映射 + 落库 lint 底线），本批 46 道有 `shopKeyword`（见 draft `_meta.shopKeywordMap`）。

落库规则：

1. **中式细分菜系**（川/湘/粤/东北/江浙…）默认**不补**——本身就是稳定 POI 类型词，`cuisineKeyword` 够用。
2. **必须补**的是回退词过宽/不准的菜：
   - `western-generic` 回退「西餐厅」太宽 → 牛排/焗饭/贝果/凯撒卷补更具体店型（牛排/贝果/轻食沙拉…）。
   - `jpkr` 拉面/炸鸡/寿司/烤肉 → 补（日式拉面/炸鸡/寿司/日式烧肉），否则全退回「日本料理/韩国料理」太宽。
   - `exotic`（尤其 `exotic-generic`/`mideast`/`indian`/`sea`）→ 补国别店型（印度菜/越南菜/泰国菜/土耳其烤肉/东南亚菜…）。
   - 便利店/快餐/小吃品类（三明治/饭团/法包/鸡肉卷…）→ 补。
3. **禁止**直接用 `displayQuery`（菜名）当 `shopKeyword`——菜名会 fail-closed（赌店招含菜名）。`shopKeyword` 必须是店型/品类词。示例：日式酱油拉面→`日式拉面`、韩式炸鸡→`炸鸡`、战斧牛排→`牛排`、印度咖喱羊肉饭→`印度菜`、越南猪肉法包→`越南菜`。
4. **落库 lint 底线**（`gen-dish-candidates.mjs` 自检已实现）：凡 `cuisine ∈ {western-generic, exotic-generic, indian, mideast}`，或 `name` 命中 `拉面/炸鸡/牛排/寿司/烤肉/烧肉(非红烧)/三明治/贝果/法包/咖喱`，**必须**显式有 `shopKeyword`，且 `shopKeyword !== name`。缺失或等于菜名即自检失败，阻断落库。

> 阶段目标 = 基础功能质量：availability 不需完美，但不能明显虚。此项已定，S3 可落库。

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
- **主路径 = 水占单菜抽取（`useDivinationPick`）**。老虎机（`useRoulette`）已在 **S9 删除**（无路由可达的死代码）；后续**不要为旧 roulette 复杂化水占模型**（见 §3.1 末的历史设计说明）。

### 3.1 ⚠️ 下午茶(tea) 的取池路径（必须在 S4 落实，否则 tea 会塌池）

**问题**：水占单菜（`useDivinationPick.ts:149`）现调 `mainFoodsByMeal(meal)`。一旦按 §3 把 `pickLayer==="side"` 排除出默认池，`meal==="tea"` 时——因为下午茶几乎全是 side/drink（见 §4.2）——meal 层会**变薄甚至空池**，真实抽取直接塌。

**解法**：新增一个**只服务水占单菜抽取**的取池入口 `foodsByMealForSinglePick(meal)`，**只此一处判 tea**。因为水占只产出**一个**结果，下午茶抽到饮品/甜点/小食都成立，所以 tea 可以并入 drink；这不会污染任何"主食轴"概念。

```ts
/**
 * 水占单菜抽取的取池入口（S4 起 useDivinationPick 改调此函数，替代直接 mainFoodsByMeal）。
 * ⚠️ 仅服务水占（单一结果）。不要用于老虎机——老虎机前两轴是"主食"，混入 drink 会语义错乱（见下）。
 * - 非 tea：纯 meal 层单菜池（干净、顶饱）。
 * - tea（下午茶）：meal 层 + side + drink 并集。水占只出一个结果，抽到饮品/甜点/小食都合理。
 */
export function foodsByMealForSinglePick(meal: MealType): Food[] {
  if (meal !== "tea") return mainFoodsByMeal(meal);        // 默认：纯 meal 层
  return [
    ...mainFoodsByMeal("tea"),   // 少量能当正餐的下午茶（若有）
    ...sideFoods("tea"),         // 小食/甜点/配菜（pickLayer==="side"）
    ...drinkFoodsByMeal("tea"),  // 饮品（kind==="drink"）——仅因水占单结果，抽到饮品成立
  ];
}
```

**老虎机（S9 已删除；下述为当时的历史说明）**：`useRoulette.ts:179` 在删除前保持现状，**未改调上面的函数**。此段记录当时的约束——若未来要重建一套两菜一饮玩法并支持 tea，仍应遵循：另设独立入口，且**前两轴绝不能混入 drink**：

```ts
// 【未来可选，非本阶段任务】老虎机前两轴专用：tea 也只给 main+side，不含 drink；
// 第三轴仍单独用 drinkFoodsByMeal("tea")。
export function rouletteMainsByMeal(meal: MealType): Food[] {
  if (meal !== "tea") return mainFoodsByMeal(meal);
  return [...mainFoodsByMeal("tea"), ...sideFoods("tea")]; // 不含 drink
}
```

- **口径界定**：`foodsByMealForSinglePick` 的 tea 场景是三池并集；其它餐段严格只用 meal 层。side/drink 不会泄漏到早/午/晚/宵的默认单菜抽取。
- **契约影响**：§5.1 抽取顺序里，第 1 步「餐段过滤」对 tea 改用 `foodsByMealForSinglePick("tea")`；后续 family 硬墙、去重、价位桶抽样逻辑不变（桶抽样对 tea 的 side/drink 同样适用，因为它们也有 priceTier）。
- ⚠️ **drink 视为 family-neutral（S4 必须明确 + 覆盖测试）**：下午茶的饮品（咖啡/奶茶/气泡水等）不归属任何菜系 family。family 硬墙**只作用于 dish（main/side）**，**不得**用它过滤 drink——否则「西餐 + 下午茶」会把咖啡/奶茶误滤掉，tea 池再次塌薄。实现时 `applyFamily` 对 `kind==="drink"` 直接放行；S4 测试须覆盖「选定某 family + tea」时 drink 仍在池内。
- **落库前提**：tea 的 side/drink 供给量由后续「甜点/小食/饮品批次」补足（§4.2），S4 只负责接通取池路径。**S4 完成的验收**：`foodsByMealForSinglePick("tea")` 非空且不含被 §3 排除的 brand/dining_style/dish_group；且「任一 family + tea」下 drink 不被 family 墙滤空。

---

## 4. 新菜补齐矩阵（目标 & 缺口）

> ⚠️ **口径 = meal 层 only，且按"菜数"而非"行数"计**。缺口矩阵只统计 `pickLayer === "meal"` 的 dish（默认单菜池的真实供给）。
> `side` 层（satiety<3）**是额外产出，不占任何 meal 缺口配额**（见 §4.1）。
> 收尾判据：**不是"总共写了 129 行"，而是"meal 层净增达到各格目标"**——写了多少 side 行都不算数。

dish（meal 层）目标：Phase 1 硬验收以 §7 全库 lint 为准（餐段 40/120/140/70 + family×price budget≥8/normal≥15/treat≥8）。~237/240 是早期旧 baseline 下的规划量级，现降级为**历史/长期参考**，不作为收尾判据（见 §4.0 作废说明）。各格 = 目标(meal 净增)。详见 `dish-candidates.draft.json`。

| family | budget | normal | treat | 合计(meal) |
|---|---|---|---|---|
| chinese | 35 (+18) | 65 (+22) | 14 (+9) | 114 |
| western | 10 (+8) | 22 (+13) | 9 (+8) | 41 |
| jpkr | 10 (+7) | 24 (+13) | 9 (+7) | 43 |
| exotic | 10 (+4) | 20 (+12) | 9 (+8) | 39 |
| **补齐合计(meal)** | +37 | +60 | +32 | **+129 meal** |

### 4.0 各批次 meal 产出（草案/落库口径，非 §7 全库验收）

> ⚠️ 本表是**草案/落库产出量**，不是验收标准。Phase 1 硬验收以 §7 全库 lint 为准（`scripts/lint-foods-fulldb.mjs`，读真实 foods.ts）。
> 初版 4 family 目标 129 meal（chinese 49 / western 29 / jpkr 27 / exotic 24）。S3 落库后为满足 §7 餐段门槛（早/宵），补批新增 18 道 meal + 重分 8 道回 meal，**实际草案/落库 = 147 meal + 7 side**。真实全库默认 meal 池以 lint 输出为准（当前 223）。

| 口径 | meal | side | 说明 |
|---|---|---|---|
| 初版目标（4 family 矩阵） | 129 | — | chinese 49 / western 29 / jpkr 27 / exotic 24 |
| 实际草案（含补批 18 + 重分回归） | 147 | 7 | 见生成器 `_meta.layerDistribution` |
| 全库默认 meal 池（落库后真实） | 223 | — | `lint-foods-fulldb.mjs` 输出，§7 验收依据 |

> 收尾判据 = §7 全库 lint 全绿（餐段 40/120/140/70 + family×price b8/n15/t8 + 0 默认池污染），不是「补了多少行」。

**餐段最低标准（dish **meal 层** 主食，去重按餐段命中）与当前缺口：**

> 口径 = 真实默认 meal 池（`kind==="main" && entityType==="dish" && pickLayer==="meal"`）。side 层不计入下表。
> ⚠️ **下午茶(tea) 不列入 meal-only 硬指标**——见 §4.2。
> ⚠️ **family×price 达标 ≠ 餐段达标**：补菜必须同时满足餐段最低量，否则 lint 会红。
> ⚠️ **验收口径已改为全库 lint**（`scripts/lint-foods-fulldb.mjs`，读真实 `foods.ts`），不再看 draft 单批 `_meta`。生成器 `_meta.mealRemaining` 的 baseline 现已改为**从 `foods.ts` 真实默认池动态计算**（排除本草案 id），S3 落库后不会再失真。

| 餐段 | 目标(meal, §7 硬门槛) | 全库现状 | 状态 |
|---|---|---|---|
| 早餐 breakfast | ≥40 | 40 | ✅ |
| 午饭 lunch | ≥120 | 158 | ✅ |
| 下午茶 tea | **不设 meal 硬指标** | — | 走 side/snack/drink 池，见 §4.2 |
| 晚饭 dinner | ≥140 | 192 | ✅ |
| 宵夜 midnight | ≥70 | 70 | ✅ |

> **历史规划值（已作废，勿据此收尾）**：早期 §4 曾按迁移前旧 baseline（早 29 / 午 75 / 晚 79 / 宵 33）规划出「补齐后 41/158/197/79」「总 meal 237/240 量级」。S3 schema 迁移把大量存量早餐/宵夜小件降为 `side`（真实 old default-pickable 早=11、宵=15，非 29/33），旧结论不成立。**Phase 1 硬验收以 §7 lint 全绿为准，不追旧量级数字。** 实际执行：8 道被 migration 误降级的一餐级早餐已重分回 meal（`reclassify-breakfast.mjs`），另补 18 道（早+9/宵+9，含 jpkr-budget/exotic-budget 各 +1 修 family×price）。

### 4.1 side 层单独指标（额外产出，不并入 meal 缺口）

`side`（satiety<3：凉菜/小食/配菜/汤水/早点小件）单独计量，服务于「组合推荐 / 加个菜 / 下午茶」，**不进默认单菜池**，因此**不占 §4 任何 meal 配额**。

- 中式第一批 side 产出 = **7**：白粥配小菜 / 茶叶蛋 / 咸豆浆 / 上海小馄饨 / 皮蛋豆腐 / 卤味拼盘 / 夫妻肺片。
- side 层目标暂不设硬门槛（Phase 1 先积累），落库后按 `sideFoods()` 归入 side 集合。⚠️ `sideFoods()` 取值必须 `entityType==="dish" && pickLayer==="side"`，只按 `pickLayer` 会把火锅/品牌/dish_group（51 个非 dish）漏入 side 池——见 §7 规则 4。
- ⚠️ 历史提示（已处理）：S3 migration 曾把一批真实一餐级早餐（煎饼果子/生煎包/淮南牛肉汤等）误降为 side（LIGHT_RE 误匹配「果」、role=snack 误伤），导致早餐/宵夜 meal 供给虚薄。已由 `reclassify-breakfast.mjs` 纠正 8 道 + 补批 18 道，全库 lint 现已达标（早 40 / 宵 70）。

### 4.2 下午茶(tea) 口径：走 side/snack/drink，不走 meal-only

下午茶本质是**小食 / 甜点 / 饮品**场景，不是"一顿正餐"。若强行要求 tea 的 meal 层达到 50，会逼出一堆不真实的「下午茶正餐」。因此：

- **tea 不列入 §4 的 meal-only 硬指标**，也不在 lint 规则「餐段够量」里对 tea 设 meal 阈值。
- 下午茶供给由 **side 层（`pickLayer==="side"`）+ drink 池** 承担；这些条目 `meals` 含 `"tea"` 即可被下午茶场景取用。**取池路径见 §3.1 `foodsByMealForSinglePick("tea")`（S4 必须落实，否则 tea 塌池）。**
- 目标改为「tea 场景（side+drink，含 `meals:["tea"]`）候选 ≥ 阈值」，放到后续**甜点/小食/饮品批次**统一定量，不占 meal 缺口。
- 第一批 tea meal = 0 属**预期正确**，非缺陷。

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
foodsByMealForSinglePick(meal)  # 1. 餐段过滤（§3.1，仅水占；非 tea=meal 层单菜池；tea=main+side+drink 并集，防塌池）
  → applyFamily(families)    # 2. family 硬墙
  → (已是 dish/合规池)       # 3. 池由 §3/§3.1 入口保证，无需再滤 entityType
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

抽桶时，若命中的目标桶在**当前候选池（family∩meal∩unseen；tea 场景含 side/drink，见 §3.1）**内为空：

1. **只在当前候选池内**把该空桶的概率质量，按 mix 里其余**非空**桶的相对比例重新分配。
2. 绝不回退到全库、绝不跨 family、绝不放宽到 non-candidate（即不越过 §3/§3.1 入口界定的池）。
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
4. **pickLayer 与 satiety 一致（仅 `entityType==="dish"`）**：对 concrete dish，`pickLayer==="meal"` ⟺ `satiety>=3`、`pickLayer==="side"` ⟺ `satiety<3`。**非 dish（brand/dining_style/dish_group）不参与此双向规则**——它们 `pickLayer` 恒为 `"side"`（抽取策略），但 `satiety` 保留真实值（火锅/烤肉可 4/5）。三者语义正交：**satiety=真实体验属性，pickLayer=抽取层政策，entityType=能否进具体菜池的硬门**。drink 亦豁免（satiety=1/pickLayer=side 固定）。
   > ⚠️ 实现细节（S4/S5 必守）：`sideFoods()` 取 side 池必须过滤 `entityType==="dish" && pickLayer==="side"`，**不能只按 `pickLayer==="side"`**，否则火锅/品牌/炸鸡泛类会漏进 side 池。默认池同理保持 `kind==="main" && entityType==="dish" && pickLayer==="meal"`。
5. **餐段够量**（dish **meal 层**，按餐段命中计，side 不计）：早≥40 / 午≥120 / 晚≥140 / 宵≥70。**tea 不设 meal 阈值**（见 §4.2，走 side/drink）。
6. **family×price 不塌**（仅 meal 层）：每个 family 的每个 priceTier 桶，meal-dish 数 ≥ 阈值（budget≥8, normal≥15, treat≥8）。
7. **treat 质量门**：每个 `treat` 且 `pickLayer==="meal"` 的 dish 必须 `indulgence>=4 && satiety>=3` 且 tags 不含「健康轻食」（**不检查「清淡」**）。
8. **id 唯一**；**canonicalGroup 若存在，组内 cuisine 一致**。
9. **每家族每餐段非空**（meal 层，**tea 除外**）：4 family × 4 meal（早/午/晚/宵）= 16 格，每格 meal-dish 数 ≥3（防「选西餐+早餐」塌池）。tea 不参与此项。
10. **无乱码**：任何字符串字段不得含 U+FFFD（`�`）。
11. **tea 取池非空**（§3.1）：`foodsByMealForSinglePick("tea")` 必须非空，且不含 `brand/dining_style/dish_group`。防止 side 被排除后下午茶真实抽取塌池。

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
| S1 ✅ | 扩展 `types/food.d.ts`（§1 新字段 + 枚举） | 类型就绪 | — |
| S2 ✅ | 给**存量 192 条**补新字段（satiety/indulgence/convenience/occasion/pickLayer/search），id 不动（`migrate-existing-foods.mjs`） | 存量迁移完 | S1 |
| S3 ✅ | 落库 136 新菜 + 补批 18 + 重分 8 回 meal；全库 lint 达 §7 硬门槛（`land-dishes.mjs`/`lint-foods-fulldb.mjs`） | 数据达标 | S0,S1 |
| S4 ✅ | 加 `isDefaultPickable` + `mainFoodsByMeal` 净化 + `sideFoods`（entityType==="dish" 口径）+ `foodsByMealForSinglePick`（§3.1）；水占 hook 改调它；`applyFamily`/`applyFunnel` 令 drink family-neutral；给 33 饮品补 store-type shopKeyword。**老虎机 `useRoulette` 未动（deprecated）** | 默认池纯净 + tea 不塌 + drink 可用性正确 | S1 |
| S5 ✅ | `pick-core` 加 budgetBucketMix + resolveBucket + indulgenceWeight；`pickOneMain` 改「先抽桶、桶内加权」+ canonicalGroup 软避；水占路径移除旧 budgetWeight/richnessWeight（保留导出给 deprecated roulette）。抽样验证：lunch+treat treat 桶命中 0.749；空 treat 桶 fallback 0 越 family | 抽取策略新（P0 修复） | S4 |
| S6 ✅ | 数据 lint = `scripts/lint-foods-fulldb.mjs`（覆盖 §7）；引入 Vitest（`vitest.config.ts` + `test`/`test:run`/`lint:data` 脚本）+ 23 个单测（resolveBucket/indulgenceWeight/canonicalGroup/tea 池/默认池/family-neutral）。为可测性把桶抽样纯逻辑下沉到 `pick-core` 的 `pickInPool`/`bucketCandidateWeight` | 验证就位 | S2-S5 |
| S7 ✅ | 全绿：`vitest run` 23/23、`tsc --noEmit`、`next lint`、`next build`、`lint-foods-fulldb` | 绿 | S6 |

> **S2 与 S3 是最大工作量**（存量迁移 + 新菜落库），但都是纯数据、低风险，可并行分块。S4/S5 是核心逻辑改动，必须有 S6 的测试兜底后再 merge。
> UI 零改动（额外要求 A）：全部改动收敛在 types / config / lib / scripts，`water-concept/page.tsx` 与各组件不动。
