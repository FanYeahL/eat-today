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
import type { CuisineFamily, MealType } from "@/types/food";

const FORBIDDEN = ["brand", "dining_style", "dish_group"] as const;
const SEG: MealType[] = ["breakfast", "lunch", "dinner", "midnight"];
const SEG_FLOOR: Record<string, number> = { breakfast: 40, lunch: 120, dinner: 140, midnight: 70 };
const FAMILIES: CuisineFamily[] = ["chinese", "western", "jpkr", "exotic"];

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
      expect(pool.some((f) => FORBIDDEN.includes(f.entityType as never))).toBe(false);
      expect(pool.length).toBeGreaterThanOrEqual(SEG_FLOOR[seg]);
    }
  });

  it("sideFoods 仅 entityType==dish && pickLayer==side（火锅/品牌不漏入）", () => {
    const side = sideFoods();
    expect(side.every((f) => f.kind === "main" && f.entityType === "dish" && f.pickLayer === "side")).toBe(true);
    // 反例佐证：若只按 pickLayer==side，会多带非 dish
    const naive = foods.filter((f) => f.pickLayer === "side");
    expect(naive.length).toBeGreaterThan(side.length);
  });
});

describe("tea 取池 (§3.1)", () => {
  const tea = foodsByMealForSinglePick("tea");

  it("非空且无 brand/dining_style/dish_group", () => {
    expect(tea.length).toBeGreaterThan(0);
    expect(tea.some((f) => FORBIDDEN.includes(f.entityType as never))).toBe(false);
  });

  it("= meal + side + drink 三池并集", () => {
    const expected =
      mainFoodsByMeal("tea").length + sideFoods("tea").length + drinkFoodsByMeal("tea").length;
    expect(tea.length).toBe(expected);
    expect(tea.some((f) => f.kind === "drink")).toBe(true);
  });

  it("任意 family 过滤后 drink 全部保留（family-neutral）", () => {
    const drinkCount = tea.filter((f) => f.kind === "drink").length;
    for (const fam of FAMILIES) {
      const after = applyFamily(tea, [fam]);
      expect(after.filter((f) => f.kind === "drink").length).toBe(drinkCount);
      // 非 drink 项必须属于该 family（family 墙对 dish 生效）
      expect(after.filter((f) => f.kind !== "drink").every((f) => familyOf(f.cuisine) === fam)).toBe(true);
    }
  });

  it("非 tea 餐段不含 side/drink/非默认项", () => {
    for (const seg of ["breakfast", "lunch", "dinner", "midnight"] as MealType[]) {
      const pool = foodsByMealForSinglePick(seg);
      expect(pool.every((f) => isDefaultPickable(f))).toBe(true);
    }
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
    for (const f of multi!) expect(canonicalGroupOfFoodId(f.id)).toBe(f.canonicalGroup);
  });

  it("未分组的 id 返回 undefined", () => {
    const nogroup = foods.find((f) => !f.canonicalGroup);
    expect(canonicalGroupOfFoodId(nogroup!.id)).toBeUndefined();
    expect(canonicalGroupOfFoodId("does-not-exist")).toBeUndefined();
  });
});
