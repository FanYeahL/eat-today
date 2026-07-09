import { describe, it, expect } from "vitest";
import {
  resolveBucket,
  indulgenceWeight,
  bucketCandidateWeight,
  budgetBucketMix,
  applyFamily,
  normalizeFilters,
  normalizeRegion,
  pickInPool,
  DEFAULT_FILTERS,
  type BucketPickContext,
} from "@/lib/pick-core";
import { EMPTY_AFFINITY } from "@/lib/regulars";
import type { Food, PriceTier } from "@/types/food";

// —— 测试用 Food 工厂（只填抽样相关字段）——
function dish(over: Partial<Food> & { id: string; cuisine: Food["cuisine"] }): Food {
  return {
    name: over.id,
    emoji: "🍚",
    kind: "main",
    entityType: "dish",
    role: "main",
    priceTier: "normal",
    spicy: 0,
    tags: [],
    meals: ["lunch"],
    recommend: 3,
    satiety: 3,
    indulgence: 3,
    convenience: "restaurant",
    occasion: ["solo"],
    pickLayer: "meal",
    search: { gateQuery: "x", displayQuery: "x", fallbackQueries: ["x"] },
    ...over,
  };
}

const baseCtx = (): BucketPickContext => ({
  region: "all",
  regionActive: false,
  mood: "any",
  affinity: EMPTY_AFFINITY,
  avoidIds: new Set(),
  recentIds: new Set(),
  avoidGroups: new Set(),
});

describe("resolveBucket (§6 空桶 fallback)", () => {
  const P: PriceTier[] = ["budget", "normal", "treat"];

  it("treat 预算 + 三桶非空 → treat 命中率 ≈0.75", () => {
    const mix = budgetBucketMix.treat;
    const nonEmpty = new Set<PriceTier>(P);
    let treat = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (resolveBucket(mix, nonEmpty) === "treat") treat++;
    expect(treat / N).toBeGreaterThan(0.70);
    expect(treat / N).toBeLessThan(0.80);
  });

  it("treat 桶空、normal+budget 非空 → 全部落 normal（budget 在 treat mix 权重为 0）", () => {
    const mix = budgetBucketMix.treat; // {budget:0, normal:0.25, treat:0.75}
    const nonEmpty = new Set<PriceTier>(["budget", "normal"]);
    const hits = new Set<string>();
    for (let i = 0; i < 5000; i++) hits.add(resolveBucket(mix, nonEmpty)!);
    expect(Array.from(hits)).toEqual(["normal"]); // budget 权重 0，绝不命中
  });

  it("treat+normal 都空、只剩 budget → fallback 到 budget", () => {
    const mix = budgetBucketMix.treat;
    const nonEmpty = new Set<PriceTier>(["budget"]);
    // mix 里 budget 权重 0 → active 为空 → 放宽到「任何非空桶均匀」→ budget
    for (let i = 0; i < 100; i++) expect(resolveBucket(mix, nonEmpty)).toBe("budget");
  });

  it("全空 → null（上层作 exhausted）", () => {
    expect(resolveBucket(budgetBucketMix.treat, new Set())).toBeNull();
  });
});

describe("indulgenceWeight (§5.3)", () => {
  it("treat 桶不惩罚「清淡」：清淡但 indulgence>=4 → ×1.8", () => {
    const f = dish({ id: "a", cuisine: "cn-guangdong", tags: ["清淡"], indulgence: 4, satiety: 3 });
    expect(indulgenceWeight(f, "treat")).toBe(1.8);
  });

  it("treat 桶惩罚「健康轻食」→ ×0.2（所有餐段，含 tea）", () => {
    const f = dish({ id: "b", cuisine: "cn-generic", tags: ["健康轻食"], indulgence: 4, satiety: 3 });
    expect(indulgenceWeight(f, "treat")).toBe(0.2);
    expect(indulgenceWeight(f, "treat", "tea")).toBe(0.2); // tea 也照常降轻食
  });

  it("treat 桶惩罚 indulgence<=2 → ×0.2（所有餐段）", () => {
    expect(indulgenceWeight(dish({ id: "d", cuisine: "cn-generic", satiety: 3, indulgence: 2 }), "treat")).toBe(0.2);
    expect(indulgenceWeight(dish({ id: "d2", cuisine: "cn-generic", satiety: 1, indulgence: 2 }), "treat", "tea")).toBe(0.2);
  });

  it("正餐 treat 仍惩罚 satiety<3（口径不变）→ ×0.2", () => {
    const snack = dish({ id: "c", cuisine: "cn-generic", satiety: 2, indulgence: 4 });
    expect(indulgenceWeight(snack, "treat")).toBe(0.2); // meal 缺省=正餐口径
    expect(indulgenceWeight(snack, "treat", "lunch")).toBe(0.2);
    expect(indulgenceWeight(snack, "treat", "dinner")).toBe(0.2);
  });

  it("tea treat 不因 satiety<3 惩罚高 indulgence 甜品/饮品 → ×1.8", () => {
    // 巴斯克芝士（satiety 2、indulgence 5）这类：下午茶该抽到，不该被顶饱门降权
    const cake = dish({ id: "cake", cuisine: "western-generic", satiety: 2, indulgence: 5, role: "snack" });
    expect(indulgenceWeight(cake, "treat", "tea")).toBe(1.8);
    // 对照：同一道在正餐口径会被 satiety<3 降到 0.2
    expect(indulgenceWeight(cake, "treat", "lunch")).toBe(0.2);
    // 饮品（satiety 1、indulgence 4）同理
    const drink = dish({ id: "dirty", cuisine: "cn-generic", kind: "drink", satiety: 1, indulgence: 4, role: "snack" });
    expect(indulgenceWeight(drink, "treat", "tea")).toBe(1.8);
  });

  it("budget/normal 桶恒 1（即便轻食，任意餐段）", () => {
    const f = dish({ id: "e", cuisine: "cn-generic", tags: ["健康轻食"], indulgence: 1, satiety: 1 });
    expect(indulgenceWeight(f, "budget")).toBe(1);
    expect(indulgenceWeight(f, "normal")).toBe(1);
    expect(indulgenceWeight(f, "normal", "tea")).toBe(1);
  });
});

describe("bucketCandidateWeight — tea 场景关闭 role main 偏向", () => {
  it("非 tea：role===main ×1.6 生效", () => {
    const mainDish = dish({ id: "m1", cuisine: "cn-generic", role: "main", priceTier: "normal" });
    const snackDish = dish({ id: "s1", cuisine: "cn-generic", role: "snack", priceTier: "normal" });
    const ctx = baseCtx(); // meal 缺省
    expect(bucketCandidateWeight(mainDish, "normal", ctx)).toBeCloseTo(1.6, 6);
    expect(bucketCandidateWeight(snackDish, "normal", ctx)).toBeCloseTo(1, 6);
  });

  it("tea：role===main 不再 ×1.6（波奇饭/沙拉不盖过甜品）", () => {
    const mainDish = dish({ id: "m2", cuisine: "cn-generic", role: "main", priceTier: "normal" });
    const ctx: BucketPickContext = { ...baseCtx(), meal: "tea" };
    expect(bucketCandidateWeight(mainDish, "normal", ctx)).toBeCloseTo(1, 6);
  });

  it("tea treat：高 indulgence 甜品(role snack, satiety 2) 权重高于 role main 轻食(indulgence 2)", () => {
    const cake = dish({ id: "cake2", cuisine: "western-generic", role: "snack", priceTier: "treat", satiety: 2, indulgence: 5 });
    const salad = dish({ id: "salad2", cuisine: "cn-generic", role: "main", priceTier: "treat", satiety: 3, indulgence: 2, tags: ["健康轻食"] });
    const ctx: BucketPickContext = { ...baseCtx(), meal: "tea" };
    const wCake = bucketCandidateWeight(cake, "treat", ctx);
    const wSalad = bucketCandidateWeight(salad, "treat", ctx);
    expect(wCake).toBeGreaterThan(wSalad);
    expect(wCake).toBeCloseTo(1.8, 6); // 甜品：indulgence>=4 ×1.8，role main 加权不触发
    expect(wSalad).toBeCloseTo(0.2, 6); // 轻食：健康轻食降权
  });
});

describe("pickInPool — tea + treat 抽样不塌到普通菜（端到端）", () => {
  // 复刻真实 tea 池的价位构成：treat 桶有真甜品/饮品(satiety 低)，normal 桶有正餐轻食。
  const cake = dish({ id: "cake", cuisine: "western-generic", role: "snack", priceTier: "treat", satiety: 2, indulgence: 5 });
  const tiramisu = dish({ id: "tira", cuisine: "western-italian", role: "snack", priceTier: "treat", satiety: 2, indulgence: 4 });
  const dirty = dish({ id: "dirty", cuisine: "cn-generic", kind: "drink", role: "snack", priceTier: "treat", satiety: 1, indulgence: 4 });
  const pokeBowl = dish({ id: "poke", cuisine: "cn-generic", role: "main", priceTier: "normal", satiety: 3, indulgence: 2 });
  const chickenSalad = dish({ id: "salad", cuisine: "cn-generic", role: "main", priceTier: "normal", satiety: 2, indulgence: 2, tags: ["健康轻食"] });
  const pool = [cake, tiramisu, dirty, pokeBowl, chickenSalad];

  it("tea + treat：绝大多数抽到 treat 桶的甜品/饮品，而非 normal 桶的波奇饭/沙拉", () => {
    const ctx: BucketPickContext = { ...baseCtx(), meal: "tea" };
    const treatIds = new Set(["cake", "tira", "dirty"]);
    let treatHits = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const got = pickInPool(pool, "treat", ctx);
      if (treatIds.has(got.id)) treatHits++;
    }
    // treat 桶非空 → budgetBucketMix.treat 的 0.75 生效，绝大多数落 treat；
    // 修复前 treat 桶为空只能 fallback normal（波奇饭/沙拉），此处应远高于那种情形。
    expect(treatHits / N).toBeGreaterThan(0.70);
  });

  it("正餐 lunch + treat：satiety<3 的甜品被降权，正餐轻食反而更可能（对照，证明没动正餐）", () => {
    // 同一池按 lunch 口径：treat 桶里 cake/tira/dirty 都 satiety<3 → ×0.2；
    // 但 normal 桶的波奇饭 satiety3/indulgence2 在 normal 桶恒权重 1，且 role main ×1.6。
    // 这里只断言「lunch 下甜品不再被特判豁免」——treat 桶内甜品权重回到 0.2。
    const lunchCtx: BucketPickContext = { ...baseCtx(), meal: "lunch" };
    expect(bucketCandidateWeight(cake, "treat", lunchCtx)).toBeCloseTo(0.2, 6);
    expect(bucketCandidateWeight(dirty, "treat", lunchCtx)).toBeCloseTo(0.2, 6);
  });
});

describe("canonicalGroup 软避 (§5.4，经 bucketCandidateWeight)", () => {
  it("命中 avoidGroups → ×0.15", () => {
    const f = dish({ id: "x1", cuisine: "cn-jiangzhe", canonicalGroup: "yimian" });
    const ctx = baseCtx();
    const wNo = bucketCandidateWeight(f, "normal", ctx);
    ctx.avoidGroups = new Set(["yimian"]);
    const wYes = bucketCandidateWeight(f, "normal", ctx);
    expect(wYes).toBeCloseTo(wNo * 0.15, 6);
  });

  it("无 canonicalGroup 的菜不受影响", () => {
    const f = dish({ id: "x2", cuisine: "cn-generic" });
    const ctx = baseCtx();
    ctx.avoidGroups = new Set(["yimian"]);
    expect(bucketCandidateWeight(f, "normal", ctx)).toBe(bucketCandidateWeight(f, "normal", baseCtx()));
  });
});

describe("applyFamily 顺序契约 + drink family-neutral", () => {
  it("按 family 硬过滤 dish", () => {
    const pool = [
      dish({ id: "cn1", cuisine: "cn-generic" }),
      dish({ id: "w1", cuisine: "western-generic" }),
    ];
    const out = applyFamily(pool, ["western"]);
    expect(out.map((f) => f.id)).toEqual(["w1"]);
  });

  it("drink 不被 family 墙滤掉（family-neutral）", () => {
    const pool = [
      dish({ id: "w1", cuisine: "western-generic" }),
      dish({ id: "drink1", cuisine: "cn-generic", kind: "drink" }),
    ];
    const out = applyFamily(pool, ["western"]);
    expect(out.map((f) => f.id).sort()).toEqual(["drink1", "w1"]);
  });

  it("family 过滤后为空 → 退回原池（不空池）", () => {
    const pool = [dish({ id: "cn1", cuisine: "cn-generic" })];
    expect(applyFamily(pool, ["western"])).toEqual(pool);
  });
});

describe("normalizeFilters（localStorage 脏值防线 S8）", () => {
  it("非对象输入（null / 字符串 / 数字）→ 全默认", () => {
    expect(normalizeFilters(null)).toEqual(DEFAULT_FILTERS);
    expect(normalizeFilters("garbage")).toEqual(DEFAULT_FILTERS);
    expect(normalizeFilters(42)).toEqual(DEFAULT_FILTERS);
    expect(normalizeFilters(undefined)).toEqual(DEFAULT_FILTERS);
  });

  it("非法 budget → 回默认 any（根治 budgetBucketMix[budget] === undefined 崩溃）", () => {
    // 抽取核心会 budgetBucketMix[budget]；脏 budget 会拿到 undefined 后崩。
    const out = normalizeFilters({ budget: "cheap", mood: "any", families: [] });
    expect(out.budget).toBe("any");
    // 归一化后的 budget 一定是 budgetBucketMix 的合法键
    expect(budgetBucketMix[out.budget]).toBeDefined();
  });

  it("合法 budget（treat）→ 原样保留", () => {
    expect(normalizeFilters({ budget: "treat" }).budget).toBe("treat");
  });

  it("非法 mood → 回默认 any；合法 mood 保留", () => {
    expect(normalizeFilters({ mood: "hangry" }).mood).toBe("any");
    expect(normalizeFilters({ mood: "spicy" }).mood).toBe("spicy");
  });

  it("families：滤掉非法成员、去重，保留合法家族", () => {
    const out = normalizeFilters({
      families: ["western", "klingon", "western", "chinese", 123],
    });
    expect(out.families.sort()).toEqual(["chinese", "western"]);
  });

  it("families 非数组（对象 / 字符串）→ 空数组（不限）", () => {
    expect(normalizeFilters({ families: "western" }).families).toEqual([]);
    expect(normalizeFilters({ families: { a: 1 } }).families).toEqual([]);
  });

  it("全非法字段的对象 → 等价默认", () => {
    expect(
      normalizeFilters({ budget: "x", mood: "y", families: "z" }),
    ).toEqual(DEFAULT_FILTERS);
  });
});

describe("normalizeRegion（localStorage 脏值防线 S8）", () => {
  it("合法 RegionKey 原样保留", () => {
    expect(normalizeRegion("chuanyu")).toBe("chuanyu");
    expect(normalizeRegion("all")).toBe("all");
  });

  it("非法 / 非字符串 → 回 all", () => {
    expect(normalizeRegion("atlantis")).toBe("all");
    expect(normalizeRegion(null)).toBe("all");
    expect(normalizeRegion(123)).toBe("all");
    expect(normalizeRegion("")).toBe("all");
  });
});
