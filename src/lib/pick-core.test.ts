import { describe, it, expect } from "vitest";
import {
  resolveBucket,
  indulgenceWeight,
  bucketCandidateWeight,
  budgetBucketMix,
  applyFamily,
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

  it("treat 桶惩罚「健康轻食」→ ×0.2", () => {
    const f = dish({ id: "b", cuisine: "cn-generic", tags: ["健康轻食"], indulgence: 4, satiety: 3 });
    expect(indulgenceWeight(f, "treat")).toBe(0.2);
  });

  it("treat 桶惩罚 satiety<3 与 indulgence<=2 → ×0.2", () => {
    expect(indulgenceWeight(dish({ id: "c", cuisine: "cn-generic", satiety: 2, indulgence: 4 }), "treat")).toBe(0.2);
    expect(indulgenceWeight(dish({ id: "d", cuisine: "cn-generic", satiety: 3, indulgence: 2 }), "treat")).toBe(0.2);
  });

  it("budget/normal 桶恒 1（即便轻食）", () => {
    const f = dish({ id: "e", cuisine: "cn-generic", tags: ["健康轻食"], indulgence: 1, satiety: 1 });
    expect(indulgenceWeight(f, "budget")).toBe(1);
    expect(indulgenceWeight(f, "normal")).toBe(1);
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
