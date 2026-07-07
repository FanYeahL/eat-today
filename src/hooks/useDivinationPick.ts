"use client";

/**
 * 水占·单菜抽取 hook
 * ─────────────────────────────────────────────
 * 「每次抽一道菜」的大脑：复用 pick-core 的漏斗/加权/可用性门控，
 * 但只出【一道主食】（不配对、不出饮品，区别于老虎机的两菜一饮）。
 *
 * 与 useRoulette 共用同一份 pick-core，所以 availability 门控、避重、
 * 地区加权的修复对两边同时生效，不会漂移。
 *
 * 抽取流程（与老虎机一致的稳健性）：
 * 1. 解析定位（共享缓存，不重复弹权限）。拿不到 → 降级：不按附近过滤，纯加权随机。
 * 2. 有坐标：拒绝采样——抽一道 → 查它附近有没有 → 没有就拉黑关键词、预过滤重抽，最多 6 轮。
 * 3. 永不空池：每轮预过滤空了退回原池；6 轮没全可用用最后一道兜底。
 * 上一签会被「强避」（×0.05），连占不容易连续撞同一道。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mainFoodsByMeal } from "@/config/foods";
import { getCurrentMeal } from "@/config/meals";
import { resolveCoords, type Coords } from "@/lib/geo";
import { recentFoodIds } from "@/lib/diary";
import { getAffinity } from "@/lib/regulars";
import {
  type Filters,
  DEFAULT_FILTERS,
  applyFunnel,
  applyFamily,
  regionWeight,
  budgetWeight,
  richnessWeight,
  moodWeight,
  pickBy,
  seedAvoidFactor,
  familiarFactor,
  prefilterByAvailability,
  unavailableKeywords,
} from "@/lib/pick-core";
import { keywordOf } from "@/lib/availability";
import type { Food, MealType, RegionKey } from "@/types/food";

const REGION_STORAGE_KEY = "foodie:region";
const FILTERS_STORAGE_KEY = "foodie:filters";

/**
 * 投签结果：抽中的菜 + 是否「本轮该口味已翻遍」。
 * exhausted=true 时 food 为 null——家族∩餐段整池都见过了，没有没见过的可给，
 * 由页面提示「这个口味都翻遍了，换个筛选」，而不是硬抽出重复的菜。
 */
export interface CastResult {
  food: Food | null;
  exhausted: boolean;
}

/**
 * 在一个池子里按「地区加权 × 预算偏好 × 心情偏好 × 偏正餐 × 常客熟悉 × 避重」抽一道主食。
 * 与 resonate 轴1 同一套权重，保证水占和老虎机口味一致。
 * budget/mood 是偏好权重（不硬过滤），选了就向那个方向倾斜，池子不塌。
 */
function pickOneMain(
  pool: Food[],
  filters: Filters,
  region: RegionKey,
  avoidIds: Set<string>,
  recentIds: Set<string>,
  affinity: ReturnType<typeof getAffinity>,
): Food {
  const funnel = applyFunnel(pool, filters);
  const regionActive =
    region !== "all" &&
    (filters.families.length === 0 || filters.families.includes("chinese"));
  const noSeed = new Set<string>(); // 水占无种草入口
  return pickBy(funnel, (f) => {
    let w = regionActive ? regionWeight(f, region) : 1;
    w *= budgetWeight(f, filters.budget); // 预算偏好
    w *= richnessWeight(f, filters.budget); // 丰盛度偏好（治「想吃好的」抽出轻食）
    w *= moodWeight(f, filters.mood); // 心情偏好
    if (f.role === "main") w *= 1.6; // 偏正餐
    w *= familiarFactor(f, affinity);
    return w * seedAvoidFactor(f.id, noSeed, avoidIds, recentIds);
  });
}

export function useDivinationPick() {
  // 抽中的那道菜（null = 还没占）
  const [pick, setPick] = useState<Food | null>(null);
  // 正在解析定位 + 校验可用性的过渡态
  const [verifying, setVerifying] = useState(false);
  // 最新抽中的镜像，供下一占算「避开上一签」（避免闭包拿旧值）
  const pickRef = useRef<Food | null>(null);

  // 餐段：默认稳定值避免水合不一致，挂载后按真实时间校正
  const [meal, setMeal] = useState<MealType>("lunch");
  useEffect(() => {
    setMeal(getCurrentMeal(new Date()));
  }, []);

  // 口味地区 + 漏斗筛选：默认值，挂载后从 localStorage 恢复（与老虎机共用同一份持久化）
  const [region, setRegionState] = useState<RegionKey>("all");
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  useEffect(() => {
    try {
      const savedRegion = localStorage.getItem(
        REGION_STORAGE_KEY,
      ) as RegionKey | null;
      if (savedRegion) setRegionState(savedRegion);
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters) as Partial<Filters>;
        setFiltersState({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch {
      // localStorage 不可用（隐私模式等）时忽略，用默认
    }
  }, []);

  const setRegion = useCallback((next: RegionKey) => {
    setRegionState(next);
    try {
      localStorage.setItem(REGION_STORAGE_KEY, next);
    } catch {
      // 忽略写入失败
    }
  }, []);

  const setFilters = useCallback((next: Filters) => {
    setFiltersState(next);
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 忽略写入失败
    }
  }, []);

  /**
   * 投签：抽一道菜并定下来。返回 { food, exhausted }。
   * - food：抽中的菜（也写入 state/ref）；exhausted 时为 null。
   * - exhausted：本轮已把「家族∩餐段」整池都见过了，没有没见过的可给（A：明确提示，不硬抽重复）。
   * 异步——先确认附近买得到。组件可 await 它，等定下来再推进水占动画。
   *
   * 过滤优先级（顺序很重要）：family 硬墙 → 去重(硬，不重复) → 可用性(偏好，优先附近)。
   * 去重必须在可用性之前：否则可用性把池缩小后、在小池里去重，没抽干就重复（曾导致
   * 下午茶西餐第 5 抽就重复——7 道里可用性剔到 4 道，4 道见完就循环）。
   * @param seenIds 本轮已见过的菜 id（篮子 + 跳过的 + 当前签面），硬排除不再现。
   */
  const cast = useCallback(
    async (seenIds?: Set<string>): Promise<CastResult> => {
      const base = mainFoodsByMeal(meal);
      if (base.length === 0) return { food: null, exhausted: false };
      // ★ family 硬墙最先作用：之后去重/可用性都在「家族池」内做。
      const pool = applyFamily(base, filters.families);

      const seen = seenIds ?? new Set<string>();
      // ★ 去重是硬约束，在可用性之前：先排掉本轮见过的。
      //   家族池里「没见过的」为空 = 这个口味真翻遍了 → exhausted（不硬抽重复）。
      const unseen = pool.filter((f) => !seen.has(f.id));
      if (unseen.length === 0) {
        setVerifying(false);
        return { food: null, exhausted: true };
      }

      const prev = pickRef.current;
      const avoidIds = new Set(prev ? [prev.id] : []); // 强避上一签（软避，兜底）
      const recentIds = recentFoodIds(Date.now()); // 近几天吃过的温和降权
      const affinity = getAffinity(Date.now()); // 常客熟悉度

      const settle = (food: Food): CastResult => {
        pickRef.current = food;
        setPick(food);
        return { food, exhausted: false };
      };

      // —— 拿坐标：拿不到就降级，不按附近过滤 ——
      let coords: Coords | null = null;
      setVerifying(true);
      try {
        coords = await resolveCoords();
      } catch {
        coords = null;
      }

      if (!coords) {
        setVerifying(false);
        // 无坐标：直接在「没见过的」里加权抽，不重复。
        return settle(
          pickOneMain(unseen, filters, region, avoidIds, recentIds, affinity),
        );
      }

      // —— 有坐标：在「没见过的」里优先选附近的（可用性是偏好，不破坏去重）——
      const MAX_ROUNDS = 6;
      let chosen: Food | null = null;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        // 可用性预过滤作用在 unseen 上：内部空了退回 unseen（绝不退回见过的）。
        const p = prefilterByAvailability(unseen, coords);
        const candidate = pickOneMain(p, filters, region, avoidIds, recentIds, affinity);
        const bad = await unavailableKeywords([candidate], coords);
        chosen = candidate; // 兜底留着最后一道（仍 ∈ unseen，不会重复）
        if (bad.size === 0) break; // 附近买得到，定了
        // 买不到：结果已落缓存，下一轮 prefilter 自动排除
      }

      setVerifying(false);
      return chosen ? settle(chosen) : { food: null, exhausted: false };
    },
    [meal, filters, region],
  );

  /** 复位：清空抽中的菜（回到「未占」） */
  const reset = useCallback(() => {
    setPick(null);
    pickRef.current = null;
  }, []);

  /** 抽中那道菜的查店关键词（探店用，与门控同源） */
  const pickKeyword = pick ? keywordOf(pick) : null;

  return {
    pick,
    pickKeyword,
    cast,
    reset,
    verifying,
    meal,
    setMeal,
    region,
    setRegion,
    filters,
    setFilters,
  };
}
