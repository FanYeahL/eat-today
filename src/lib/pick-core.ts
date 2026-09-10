/**
 * 抽取核心（共享纯函数）
 * ─────────────────────────────────────────────
 * 把「漏斗过滤 / 地区加权 / 加权抽样 / 综合加成 / 按可用性预过滤 / 可用性校验」
 * 这套与 UI 无关的纯逻辑收拢成纯函数，供水占（每次一道）的抽取 hook 与单测
 * 共用同一份实现——单一数据源，availability/避重等修复不会漂移。
 */

import { regionMeta, regionList } from "@/config/regions-cuisine";
import { PICK_WEIGHTS } from "./pick-weights";
import { familyOf, familyList } from "@/config/cuisine";
import {
  keywordOf,
  checkKeyword,
  cachedAvailability,
} from "@/lib/availability";
import type { Affinity } from "@/lib/regulars";
import type { Coords } from "@/lib/geo";
import type {
  Food,
  RegionKey,
  CuisineFamily,
  PriceTier,
  MealType,
} from "@/types/food";

/** 漏斗筛选：风味家族（多选）/ 心情 / 预算 */
export interface Filters {
  /** 选中的风味家族；空数组 = 不限 */
  families: CuisineFamily[];
  /**
   * 心情（四选一，对应不同口味取向）：
   * any 不挑 / spicy 想吃点辣的开胃 / mild 淡淡的就好 /
   * meat 狠狠大口吃肉 / light 控卡自律中
   */
  mood: "any" | "spicy" | "mild" | "meat" | "light";
  /** 预算：any 不限 / 具体档位 */
  budget: PriceTier | "any";
}

export const DEFAULT_FILTERS: Filters = {
  families: [],
  mood: "any",
  budget: "any",
};

// —— localStorage 恢复的脏值防线（S8）——
// 持久化的 region/filters 可能被旧版本写入、被手动改坏、或跨 app 复用同一 key 而含非法值。
// 直接 merge 进 DEFAULT_FILTERS 会让非法 budget 一路漏到 budgetBucketMix[budget] → undefined 崩溃
// （region/families 同理污染加权）。恢复时先过这层 normalize：只接受合法 enum / 数组成员，
// 其余静默回退默认，保证抽取入口拿到的永远是干净值。

/** 合法风味家族集合（来自 familyList 单一数据源） */
const VALID_FAMILIES = new Set<CuisineFamily>(familyList.map((f) => f.key));
/** 合法心情集合 */
const VALID_MOODS = new Set<Filters["mood"]>([
  "any",
  "spicy",
  "mild",
  "meat",
  "light",
]);
/** 合法预算集合（"any" + 三个价位桶键，与 budgetBucketMix 对齐） */
const VALID_BUDGETS = new Set<Filters["budget"]>([
  "any",
  "budget",
  "normal",
  "treat",
]);
/** 合法口味地区集合（来自 regionList 单一数据源，含 "all"） */
const VALID_REGIONS = new Set<RegionKey>(regionList.map((r) => r.key));

/**
 * 把 localStorage 里 JSON.parse 出来的任意值收敛成一个合法 Filters：
 * - 非对象 → 全默认。
 * - families：只保留合法家族、去重；非数组 → 空数组（不限）。
 * - mood/budget：合法 enum 才采纳，否则回默认。
 * 永不抛错——脏缓存最多退化为「不限」，绝不把非法值漏进抽取核心。
 */
export function normalizeFilters(raw: unknown): Filters {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_FILTERS };
  const r = raw as Record<string, unknown>;

  const families = Array.isArray(r.families)
    ? Array.from(
        new Set(
          r.families.filter(
            (f): f is CuisineFamily =>
              typeof f === "string" && VALID_FAMILIES.has(f as CuisineFamily),
          ),
        ),
      )
    : [];

  const mood =
    typeof r.mood === "string" && VALID_MOODS.has(r.mood as Filters["mood"])
      ? (r.mood as Filters["mood"])
      : DEFAULT_FILTERS.mood;

  const budget =
    typeof r.budget === "string" &&
    VALID_BUDGETS.has(r.budget as Filters["budget"])
      ? (r.budget as Filters["budget"])
      : DEFAULT_FILTERS.budget;

  return { families, mood, budget };
}

/**
 * 把 localStorage 里的地区串收敛成合法 RegionKey：合法则采纳，否则回 "all"（不限地区）。
 * 防止脏值漏进 regionWeight → regionMeta(region) 拿不到 tasteWeights。
 */
export function normalizeRegion(raw: unknown): RegionKey {
  return typeof raw === "string" && VALID_REGIONS.has(raw as RegionKey)
    ? (raw as RegionKey)
    : "all";
}

/**
 * 按地区给一道主食算权重（中餐二级精修，只影响主食）。
 * - 招牌菜（regions 含该地区）：×5
 * - 口味匹配（命中地区 tasteWeights 的 tag）：累乘
 * - region 为 "all" 时一律 ×1。
 */
export function regionWeight(food: Food, region: RegionKey): number {
  if (region === "all") return 1;
  let w = 1;
  if (food.regions?.includes(region)) w *= 5;
  const tw = regionMeta(region).tasteWeights;
  for (const tag of food.tags) {
    const factor = tw[tag];
    if (factor) w *= factor;
  }
  return w;
}

/**
 * 家族硬墙：按风味家族过滤。family 是用户的明确选择，一道**不可越过**的墙
 * （选了西餐绝不出中餐）。空了才退回原池。
 *
 * ⚠ drink 是 family-neutral（§3.1）：下午茶的饮品（咖啡/奶茶/气泡水等）不归属任何菜系，
 * family 墙**只作用于 dish（main/side）**，drink 一律放行——否则「西餐 + 下午茶」会把
 * 咖啡/奶茶误滤掉，tea 池塌薄。
 *
 * ⚠ 顺序契约：必须在 prefilterByAvailability / 去重（cast 内联的 unseen 过滤）**之前**作用于 base pool，
 * 保证可用性/seen 都在「家族池」内做、空了只退回家族池、绝不退回全库。
 * 否则可用性/seen 先把某家族剔光、剩别家族，family 再过滤为空→兜底吐出别家族
 * （曾导致「西餐+想吃好的」抽出长沙臭豆腐）。
 */
export function applyFamily(pool: Food[], families: CuisineFamily[]): Food[] {
  if (families.length === 0) return pool;
  const next = pool.filter(
    (f) => f.kind === "drink" || families.includes(familyOf(f.cuisine)),
  );
  return next.length > 0 ? next : pool;
}

/**
 * 漏斗过滤：只对 family 做硬过滤（风味家族是用户的明确选择，是一道墙——
 * 选了西餐就绝不出中餐）。空了就跳过该层，保证非空。
 *
 * 注意：budget / mood 不再在此硬砍——budget 改为「先抽价位桶」（见 budgetBucketMix /
 * resolveBucket），mood 改为桶内偏好权重（见 moodWeight），由调用方在抽样里生效。原因：
 * 窄家族下硬砍会把池子塌成单元素（如 西餐×treat=1 → 必中黑椒牛排；西餐×想吃辣=0 →
 * 整层被跳过、心情形同虚设）。改成权重后池子不塌，"想吃点好的/想吃辣的"变成向那个
 * 方向倾斜，而非非此即彼。
 * meal 不在这里——水占 hook 用 foodsByMealForSinglePick(meal) 在入口就按餐段过滤好了。
 */
export function applyFunnel(pool: Food[], filters: Filters): Food[] {
  if (filters.families.length > 0) {
    // drink family-neutral（§3.1）：饮品不参与 family 墙，与 applyFamily 保持一致。
    const next = pool.filter(
      (f) =>
        f.kind === "drink" || filters.families.includes(familyOf(f.cuisine)),
    );
    if (next.length > 0) return next;
  }
  return pool;
}

// ─────────────────────────────────────────────
// S5 价位桶抽样（spec §5/§6）：先按 budgetBucketMix 抽出目标价位桶，再桶内加权。
// 价位/丰盛度由「先抽桶 + 桶内 indulgenceWeight」承担（取代早期的 per-dish 软权重）。
// ─────────────────────────────────────────────

/**
 * 价位桶混合比：按用户预算档给出「先抽哪个价位桶」的概率分布（§5.2）。
 * 关键修复：treat 档 treat 桶占 0.75，根治「想吃好的却大概率抽到普通菜」——
 * 旧 per-dish 软权重下 normal 基数大会淹没 treat，桶抽样把它拉回预期。
 */
export const budgetBucketMix: Record<
  Filters["budget"],
  Record<PriceTier, number>
> = {
  any: { budget: 0.34, normal: 0.5, treat: 0.16 }, // 不选预算时贴近数据自然构成
  budget: { budget: 0.7, normal: 0.3, treat: 0 },
  normal: { budget: 0.15, normal: 0.7, treat: 0.15 },
  treat: { budget: 0, normal: 0.25, treat: 0.75 },
};

/**
 * 抽价位桶（§6 空桶 fallback）：只在当前候选池的非空桶内按 mix 比例抽。
 * - mix 里有权重且非空的桶：按相对比例抽。
 * - mix 权重桶全空：放宽到「任何非空桶均匀」（仍限本池内，绝不跨 family / 回全库）。
 * - 全空 → 返回 null（上层作 exhausted 处理，不硬抽重复）。
 */
export function resolveBucket(
  mix: Record<PriceTier, number>,
  nonEmpty: Set<PriceTier>,
): PriceTier | null {
  const active = (["budget", "normal", "treat"] as PriceTier[]).filter(
    (t) => nonEmpty.has(t) && mix[t] > 0,
  );
  if (active.length === 0) {
    const any = Array.from(nonEmpty);
    return any.length ? any[Math.floor(Math.random() * any.length)] : null;
  }
  const total = active.reduce((s, t) => s + mix[t], 0);
  let r = Math.random() * total;
  for (const t of active) {
    r -= mix[t];
    if (r <= 0) return t;
  }
  return active[active.length - 1];
}

/**
 * 桶内丰盛度乘子（§5.3）：仅 treat 桶生效，承担「想吃好的」的犒劳提权。
 * - indulgence>=4 → ×1.8（顶格犒劳菜提权）
 * - indulgence<=2 或含「健康轻食」→ ×0.2（不够犒劳 / 轻食降权）
 * - satiety<3 → ×0.2，但**仅正餐餐段**：正餐「想吃好的」该顶饱又丰盛（一道小食不算犒劳一顿）。
 * - 其它 → ×1
 *
 * ⚠️ meal 感知（下午茶特判）：下午茶的 treat 本就是「小而贵 / 精致 / 犒劳」——
 * 巴斯克芝士、提拉米苏、精品手冲天然 satiety 低，不该因为「不顶饱」被降权，否则
 * 「tea + 想吃好的」永远抽不到真正的甜品犒劳项。故 meal==="tea" 时跳过 satiety<3 惩罚，
 * 但仍照常降权 indulgence<=2 / 健康轻食（沙拉、无糖美式这类不符合「想吃好的」）。
 * 正餐餐段（早/午/晚/宵）口径完全不变。
 * ⚠️ 不惩罚「清淡」——清淡是口味非「不犒劳」信号（白灼基围虾清淡但 indulgence 4，应留）。
 * budget/normal 桶恒 1。
 */
export function indulgenceWeight(
  food: Food,
  bucket: PriceTier,
  meal?: MealType,
): number {
  if (bucket !== "treat") return 1;
  // 不够犒劳 / 轻食：一律 ×0.2（所有餐段通用，即便 indulgence 恰好>=4）
  if (food.indulgence <= 2 || food.tags.includes("健康轻食")) return 0.2;
  // 不顶饱降权：仅正餐；下午茶的甜品/饮品顶不饱是常态，不在此降权（meal 感知特判）。
  if (meal !== "tea" && food.satiety < 3) return 0.2;
  if (food.indulgence >= 4) return 1.8;
  return 1;
}

/** 桶内加权抽样的输入上下文（把 React hook 的状态收拢成纯数据，便于单测复用真实逻辑）。 */
export interface BucketPickContext {
  region: RegionKey;
  /** region 加权是否生效：非中餐 family 或 region==="all" 时关闭（中餐二级精修专用）。 */
  regionActive: boolean;
  mood: Filters["mood"];
  affinity: Affinity;
  avoidIds: Set<string>;
  recentIds: Set<string>;
  /** 已见/最近/上一签的 canonicalGroup 集合——候选命中则 ×0.15 软避（§5.4）。 */
  avoidGroups: Set<string>;
  /**
   * 当前餐段。treat 桶的丰盛度乘子据此做 tea 特判（下午茶甜品不因 satiety<3 降权）；
   * 且 tea 场景关闭「role===main ×1.6」正餐偏向——否则波奇饭/沙拉这类正餐项会盖过甜品。
   * 缺省（正餐默认路径不显式传）时按正餐口径处理，行为与改动前一致。
   */
  meal?: MealType;
}

const EMPTY_SET: Set<string> = new Set(); // 水占无种草入口，seed 集合恒空

/**
 * 桶内单候选权重（§5.3/§5.4，纯函数，供水占抽样 + 单测复用同一实现）。
 * w = regionWeight × moodWeight × (role===main?1.6，tea 场景关闭) × familiarFactor
 *     × indulgenceWeight(bucket, meal) × canonicalGroup软避 × seedAvoidFactor
 * ⚠️ budget 不在这里——价位由「先抽桶」决定（budgetBucketMix/resolveBucket），
 * 桶内只按 indulgenceWeight 调丰盛度，不再乘任何 per-dish 预算权重。
 * ⚠️ role===main ×1.6 的「偏正餐」在下午茶不成立：tea 池里 role=main 的多是波奇饭/沙拉
 * 这类正餐轻食，加权会把它们顶到甜品前面。故 meal==="tea" 时关闭该加权，只让甜品/饮品
 * 凭 indulgence 竞争；正餐餐段一切照旧。
 */
export function bucketCandidateWeight(
  food: Food,
  bucket: PriceTier,
  ctx: BucketPickContext,
): number {
  let w = ctx.regionActive ? regionWeight(food, ctx.region) : 1;
  w *= moodWeight(food, ctx.mood);
  if (food.role === "main" && ctx.meal !== "tea") w *= PICK_WEIGHTS.mainRole; // 偏正餐（下午茶不偏）
  w *= familiarFactor(food, ctx.affinity);
  w *= indulgenceWeight(food, bucket, ctx.meal); // treat 桶：犒劳提权 / 轻食降权（tea 免 satiety 惩罚）
  if (food.canonicalGroup && ctx.avoidGroups.has(food.canonicalGroup))
    w *= PICK_WEIGHTS.canonicalGroup;
  return w * seedAvoidFactor(food.id, EMPTY_SET, ctx.avoidIds, ctx.recentIds);
}

/**
 * 在一个候选池里「先抽价位桶、桶内加权抽一道」（§5.1 第 5-6 步，纯函数）。
 * 池非空即保证有返回（resolveBucket 只在整池全空时返回 null，此处 pool 非空则必命中）。
 * 顺序契约由调用方保证：进来的 pool 必须已过 applyFamily + 去重（本函数只管桶抽样）。
 */
export function pickInPool(
  pool: Food[],
  budget: Filters["budget"],
  ctx: BucketPickContext,
): Food {
  const byBucket: Record<PriceTier, Food[]> = {
    budget: [],
    normal: [],
    treat: [],
  };
  // 前置条件：pool 已通过 foods.test.ts 的运行时结构校验；不将未知价位悄悄归为 normal。
  for (const f of pool) byBucket[f.priceTier].push(f);
  const nonEmpty = new Set<PriceTier>(
    (["budget", "normal", "treat"] as PriceTier[]).filter(
      (t) => byBucket[t].length > 0,
    ),
  );
  const bucket = resolveBucket(budgetBucketMix[budget], nonEmpty);
  const inBucket = bucket ? byBucket[bucket] : pool; // 池非空 → bucket 必非 null；兜底取全池
  const activeBucket: PriceTier = bucket ?? "normal";
  return pickBy(inBucket, (f) => bucketCandidateWeight(f, activeBucket, ctx));
}

/**
 * 心情偏好 → per-dish 乘子。比预算更陡（选错心情更难受）：匹配 ×1，不匹配 ×0.15。
 * 某家族无匹配菜时，整池都 ×0.15 → 退化为均匀随机（优雅降级，而非硬过滤那样整层消失）。
 */
export function moodWeight(food: Food, mood: Filters["mood"]): number {
  const pass = moodFilter(mood);
  if (!pass) return 1; // any：不挑
  return pass(food) ? 1 : PICK_WEIGHTS.moodMismatch;
}

/** 把心情翻译成对食物的过滤谓词；any 返回 null（不过滤） */
export function moodFilter(
  mood: Filters["mood"],
): ((f: Food) => boolean) | null {
  switch (mood) {
    case "spicy":
      return (f) => f.spicy >= 2; // 想吃辣的开胃
    case "mild":
      return (f) => f.spicy <= 1 && f.tags.includes("清淡"); // 淡淡的就好
    case "meat":
      // 狠狠大口吃肉：高热量/高蛋白/下饭，且不是健康轻食
      return (f) =>
        !f.tags.includes("健康轻食") &&
        (f.tags.includes("高热量") ||
          f.tags.includes("高蛋白") ||
          f.tags.includes("下饭"));
    case "light":
      // 控卡自律中：健康轻食 或 清淡
      return (f) => f.tags.includes("健康轻食") || f.tags.includes("清淡");
    default:
      return null;
  }
}

/** 从数组里随机取一个元素 */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 通用加权抽取：weightOf 给每个元素算权重，按权重随机取一个。
 * 全 0 或空池时退回均匀随机，保证总能取到（永不空池的第二道防线）。
 */
export function pickBy<T>(pool: T[], weightOf: (item: T) => number): T {
  if (pool.length === 0) throw new Error("pickBy: 空池");
  const weights = pool.map(weightOf);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return pickRandom(pool);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * 综合加成：种草提权 / 上一轮强避 / 近几天吃过的温和降权。
 * - 种草命中 ×8（高概率候选）
 * - 上一轮摇过 ×0.05（尽量避开，不归零）
 * - 近 N 天吃过 ×0.35（看不见的避重：让它「记得你最近吃了啥」，
 *   但只是降概率不是封杀——真馋那口照样摇得到）
 */
export function seedAvoidFactor(
  id: string,
  seedIds: Set<string>,
  avoidIds: Set<string>,
  recentIds: Set<string>,
): number {
  let f = 1;
  if (seedIds.has(id)) f *= PICK_WEIGHTS.seeded;
  if (avoidIds.has(id)) f *= PICK_WEIGHTS.previous;
  if (recentIds.has(id)) f *= PICK_WEIGHTS.recent;
  return f;
}

/**
 * 常客熟悉度加成：常翻店对应的菜 / 菜系出镜率调高（隐式个性化）。
 * 取「菜倍数」与「菜系倍数」的较大值——不相乘，避免双重计数
 * （一道菜的点击本就已经计入它的菜系）。无个性化时恒为 1。
 */
export function familiarFactor(food: Food, affinity: Affinity): number {
  const byFood = affinity.byFood[food.id] ?? 1;
  const byCuisine = affinity.byCuisine[food.cuisine] ?? 1;
  return Math.max(byFood, byCuisine);
}

/**
 * 按已知可用性预过滤一个池子：排除「已查过且附近没有」的菜。
 * 未查过（cachedAvailability 返回 undefined）的留着——摇到了再校验，避免一上来全查爆额度。
 * 过滤后空了就退回原池（永不空池：乡下啥都搜不到时也得能摇）。
 */
export function prefilterByAvailability(pool: Food[], coords: Coords): Food[] {
  const kept = pool.filter(
    (f) => cachedAvailability(keywordOf(f), coords) !== false,
  );
  return kept.length > 0 ? kept : pool;
}

/**
 * 校验一组菜里每样附近是否买得到，返回不可用的「关键词」集合。
 * 串行查（不是 Promise.all）——免费高德 key 并发 QPS 上限很低，
 * 一次性并发极易撞 CUQPS 超限。串行削峰，配合 checkKeyword 的缓存，
 * 重复关键词只查一次，实际请求数往往更少。
 */
export async function unavailableKeywords(
  foods: Food[],
  coords: Coords,
): Promise<Set<string>> {
  const bad = new Set<string>();
  for (const f of foods) {
    const kw = keywordOf(f);
    const ok = await checkKeyword(kw, coords);
    if (!ok) bad.add(kw);
  }
  return bad;
}
