import { describe, it, expect } from "vitest";
import {
  foods,
  isDefaultPickable,
  mainFoodsByMeal,
  sideFoods,
  drinkFoodsByMeal,
  foodsByMealForSinglePick,
  canonicalGroupOfFoodId,
} from "@/config/foods";
import { applyFamily } from "@/lib/pick-core";
import { familyOf } from "@/config/cuisine";
import {
  isCuisine,
  isEntityType,
  isFoodTag,
  isMeal,
  isPriceTier,
  isText,
} from "@/lib/food-validation";
import { regionList } from "@/config/regions-cuisine";
import type { CuisineFamily, MealType } from "@/types/food";

const FORBIDDEN = ["brand", "dining_style", "dish_group"] as const;
const SEG: MealType[] = ["breakfast", "lunch", "dinner", "midnight"];
const SEG_FLOOR: Record<string, number> = {
  breakfast: 40,
  lunch: 120,
  dinner: 140,
  midnight: 70,
};
const FAMILIES: CuisineFamily[] = ["chinese", "western", "jpkr", "exotic"];

describe("全库运行时结构", () => {
  it("validates every actual record, including nested search fields and optional lists", () => {
    const ids = new Set<string>();
    for (const food of foods) {
      expect(ids.has(food.id), `duplicate ${food.id}`).toBe(false);
      ids.add(food.id);
      for (const field of ["id", "name", "emoji"] as const)
        expect(isText(food[field]), `${food.id}.${field}`).toBe(true);
      expect(isCuisine(food.cuisine), food.id).toBe(true);
      expect(isPriceTier(food.priceTier), food.id).toBe(true);
      expect(isEntityType(food.entityType), food.id).toBe(true);
      expect(["main", "drink"]).toContain(food.kind);
      expect(["main", "snack"]).toContain(food.role);
      expect([0, 1, 2, 3]).toContain(food.spicy);
      for (const field of ["recommend", "satiety", "indulgence"] as const)
        expect([1, 2, 3, 4, 5], `${food.id}.${field}`).toContain(food[field]);
      expect(
        Array.isArray(food.tags) && food.tags.every(isFoodTag),
        `${food.id}.tags`,
      ).toBe(true);
      expect(
        Array.isArray(food.meals) &&
          food.meals.length > 0 &&
          food.meals.every(isMeal),
        `${food.id}.meals`,
      ).toBe(true);
      expect([
        "canteen",
        "takeout",
        "restaurant",
        "convenience",
        "dorm",
      ]).toContain(food.convenience);
      expect(["meal", "side"]).toContain(food.pickLayer);
      expect(
        Array.isArray(food.occasion) &&
          food.occasion.length > 0 &&
          food.occasion.every((x) =>
            ["solo", "date", "friends", "lateNight", "quick"].includes(x),
          ),
        food.id,
      ).toBe(true);
      expect(
        isText(food.search?.gateQuery) && isText(food.search?.displayQuery),
        `${food.id}.search`,
      ).toBe(true);
      expect(
        Array.isArray(food.search?.fallbackQueries) &&
          food.search.fallbackQueries.every(isText),
        food.id,
      ).toBe(true);
      for (const field of ["aliases", "recipeIds"] as const)
        if (food[field] !== undefined)
          expect(
            Array.isArray(food[field]) && food[field]!.every(isText),
            `${food.id}.${field}`,
          ).toBe(true);
      for (const field of [
        "description",
        "shopKeyword",
        "canonicalGroup",
      ] as const)
        if (food[field] !== undefined)
          expect(isText(food[field]), `${food.id}.${field}`).toBe(true);
      if (food.regions !== undefined)
        expect(
          Array.isArray(food.regions) &&
            food.regions.every((key) => regionList.some((r) => r.key === key)),
          food.id,
        ).toBe(true);
    }
  });
});

describe("默认池纯净 (§3)", () => {
  it("isDefaultPickable 排除 brand/dining_style/dish_group/side/drink", () => {
    for (const f of foods) {
      if (f.entityType !== "dish") expect(isDefaultPickable(f)).toBe(false);
      if (f.kind === "drink") expect(isDefaultPickable(f)).toBe(false);
      if (f.pickLayer === "side") expect(isDefaultPickable(f)).toBe(false);
      if (isDefaultPickable(f)) {
        expect(f.kind).toBe("main");
        expect(f.entityType).toBe("dish");
        expect(f.pickLayer).toBe("meal");
      }
    }
  });

  it("mainFoodsByMeal 各餐段无违规实体且满足 §7 下限", () => {
    for (const seg of SEG) {
      const pool = mainFoodsByMeal(seg);
      expect(pool.every((f) => isDefaultPickable(f))).toBe(true);
      expect(pool.some((f) => FORBIDDEN.includes(f.entityType as never))).toBe(
        false,
      );
      expect(pool.length).toBeGreaterThanOrEqual(SEG_FLOOR[seg]);
    }
  });

  it("sideFoods 仅 entityType==dish && pickLayer==side（火锅/品牌不漏入）", () => {
    const side = sideFoods();
    expect(
      side.every(
        (f) =>
          f.kind === "main" &&
          f.entityType === "dish" &&
          f.pickLayer === "side",
      ),
    ).toBe(true);
    // 反例佐证：若只按 pickLayer==side，会多带非 dish
    const naive = foods.filter((f) => f.pickLayer === "side");
    expect(naive.length).toBeGreaterThan(side.length);
  });
});

describe("tea 取池 (§3.1)", () => {
  const tea = foodsByMealForSinglePick("tea");

  it("非空且无 brand/dining_style/dish_group", () => {
    expect(tea.length).toBeGreaterThan(0);
    expect(tea.some((f) => FORBIDDEN.includes(f.entityType as never))).toBe(
      false,
    );
  });

  it("= meal + side + drink 三池并集", () => {
    const expected =
      mainFoodsByMeal("tea").length +
      sideFoods("tea").length +
      drinkFoodsByMeal("tea").length;
    expect(tea.length).toBe(expected);
    expect(tea.some((f) => f.kind === "drink")).toBe(true);
  });

  it("任意 family 过滤后 drink 全部保留（family-neutral）", () => {
    const drinkCount = tea.filter((f) => f.kind === "drink").length;
    for (const fam of FAMILIES) {
      const after = applyFamily(tea, [fam]);
      expect(after.filter((f) => f.kind === "drink").length).toBe(drinkCount);
      // 非 drink 项必须属于该 family（family 墙对 dish 生效）
      expect(
        after
          .filter((f) => f.kind !== "drink")
          .every((f) => familyOf(f.cuisine) === fam),
      ).toBe(true);
    }
  });

  it("非 tea 餐段不含 side/drink/非默认项", () => {
    for (const seg of [
      "breakfast",
      "lunch",
      "dinner",
      "midnight",
    ] as MealType[]) {
      const pool = foodsByMealForSinglePick(seg);
      expect(pool.every((f) => isDefaultPickable(f))).toBe(true);
    }
  });

  it("tea 池必须含 priceTier==='treat' 候选（守卫「想吃好的」不再 fallback 到普通菜）", () => {
    // 回归防线：曾经 tea 池 treat=0，导致「tea+想吃好的」75% treat 混合比塌到 normal 桶，
    // 抽出波奇饭/鸡胸肉沙拉这类不犒劳的项。此处钉死 treat 候选存在且成规模。
    const treat = tea.filter((f) => f.priceTier === "treat");
    expect(treat.length).toBeGreaterThanOrEqual(8);
    // 且都是「想吃好的」该出的：indulgence>=4、非健康轻食
    expect(treat.every((f) => f.indulgence >= 4)).toBe(true);
    expect(treat.some((f) => f.tags.includes("健康轻食"))).toBe(false);
    // 甜品/饮品顶不饱是常态：treat 里应有 satiety<3 的项（正是本次特判要救的对象）
    expect(treat.some((f) => f.satiety < 3)).toBe(true);
  });
});

describe("meal×family×price 分布快照 + treat 桶空洞守卫 (§5/§6)", () => {
  // 每个「用户能选的核心组合」= 餐段 × 风味家族。treat 桶为 0 时，budgetBucketMix.treat 的
  // 0.75 权重会整体塌到 normal 桶 → 「想吃好的」100% 抽到普通菜（就是 tea 那个 bug 的通式）。
  // drink 是 family-neutral（applyFamily 放行），所以某 family 的 treat 可用性 =
  //   该 family 的 treat dish + 全部 treat drink。此处按 applyFamily 后的真实池计数，钉死不为 0。
  const ALL_MEALS: MealType[] = [
    "breakfast",
    "lunch",
    "tea",
    "dinner",
    "midnight",
  ];

  /** 复刻运行时：某餐段池经 applyFamily(family) 后，某价位桶的候选数（drink family-neutral 已含）。 */
  function bucketCount(
    meal: MealType,
    fam: CuisineFamily,
    price: string,
  ): number {
    const pool = applyFamily(foodsByMealForSinglePick(meal), [fam]);
    return pool.filter((f) => f.priceTier === price).length;
  }

  it("每个 餐段×家族 的 treat 桶都可达（非 0，杜绝 100% fallback）", () => {
    const holes: string[] = [];
    for (const meal of ALL_MEALS) {
      for (const fam of FAMILIES) {
        if (bucketCount(meal, fam, "treat") === 0) holes.push(`${meal}×${fam}`);
      }
    }
    expect(holes).toEqual([]);
  });

  it("每个 餐段×家族 至少还有 normal 或 budget 兜底（treat 外仍可抽）", () => {
    for (const meal of ALL_MEALS) {
      for (const fam of FAMILIES) {
        const nonTreat =
          bucketCount(meal, fam, "normal") + bucketCount(meal, fam, "budget");
        expect(nonTreat).toBeGreaterThan(0);
      }
    }
  });

  // 早餐 / 下午茶是「特殊餐段」，不套午晚餐的 family×price 规模门槛（那是 lint-foods-fulldb 的事），
  // 这里只对它们要求「treat 可达」——本组第一个用例已覆盖，这里补一个显式回归锚点。
  it("早餐每个家族 treat 可达（曾全 t=0）", () => {
    for (const fam of FAMILIES) {
      expect(bucketCount("breakfast", fam, "treat")).toBeGreaterThan(0);
    }
  });

  it("午餐 western treat 可达（曾 t=0）", () => {
    expect(bucketCount("lunch", "western", "treat")).toBeGreaterThan(0);
  });

  it("宵夜 western treat 可达（曾 t=0）", () => {
    expect(bucketCount("midnight", "western", "treat")).toBeGreaterThan(0);
  });
});

describe("canonicalGroupOfFoodId 全局映射 (P2：跨餐段软避)", () => {
  it("按 id 反查到 canonicalGroup", () => {
    const grouped = foods.find((f) => f.canonicalGroup);
    expect(grouped).toBeDefined();
    expect(canonicalGroupOfFoodId(grouped!.id)).toBe(grouped!.canonicalGroup);
  });

  it("跨餐段同组也能查到（不依赖当前餐段池）", () => {
    // 找一个 canonicalGroup 至少跨 2 道菜、且这些菜餐段不完全相同的族
    const byGroup = new Map<string, typeof foods>();
    for (const f of foods) {
      if (!f.canonicalGroup) continue;
      const arr = byGroup.get(f.canonicalGroup) ?? [];
      arr.push(f);
      byGroup.set(f.canonicalGroup, arr);
    }
    const multi = Array.from(byGroup.values()).find((arr) => arr.length >= 2);
    expect(multi).toBeDefined();
    // 组内每个成员都能被全局 map 反查到（即便不在同一餐段池）
    for (const f of multi!)
      expect(canonicalGroupOfFoodId(f.id)).toBe(f.canonicalGroup);
  });

  it("未分组的 id 返回 undefined", () => {
    const nogroup = foods.find((f) => !f.canonicalGroup);
    expect(canonicalGroupOfFoodId(nogroup!.id)).toBeUndefined();
    expect(canonicalGroupOfFoodId("does-not-exist")).toBeUndefined();
  });
});
