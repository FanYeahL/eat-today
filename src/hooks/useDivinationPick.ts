"use client";

/**
 * 水占·单菜抽取 hook
 * ─────────────────────────────────────────────
 * 「每次抽一道菜」的大脑：复用 pick-core 的漏斗/加权/可用性门控，
 * 每次只出【一个结果】（不配对）。取池口径见 foodsByMealForSinglePick：
 * 非 tea 餐段出一道主食（meal 层）；tea（下午茶）可出 meal + side + drink
 * （甜品/饮品/小食都合理，单结果不配对）。
 *
 * 逻辑全部下沉到 pick-core 纯函数（availability 门控、避重、地区加权），
 * 与单测共用同一份实现，修复不会漂移。
 *
 * 抽取流程（稳健性）：
 * 1. 解析定位（共享缓存，不重复弹权限）。拿不到 → 降级：不按附近过滤，纯加权随机。
 * 2. 有坐标：拒绝采样——抽一道 → 查它附近有没有 → 没有就拉黑关键词、预过滤重抽，最多 6 轮。
 * 3. 永不空池：每轮预过滤空了退回原池；6 轮没全可用用最后一道兜底。
 * 上一签会被「强避」（×0.05），连占不容易连续撞同一道。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  foodsByMealForSinglePick,
  canonicalGroupOfFoodId,
} from "@/config/foods";
import { getCurrentMeal } from "@/config/meals";
import { resolveCoords, type Coords } from "@/lib/geo";
import { recentFoodIds } from "@/lib/diary";
import { getAffinity } from "@/lib/regulars";
import {
  type Filters,
  DEFAULT_FILTERS,
  applyFunnel,
  applyFamily,
  prefilterByAvailability,
  unavailableKeywords,
  pickInPool,
  normalizeFilters,
  normalizeRegion,
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
 * 在一个池子里抽一道菜（S5：先抽价位桶，再桶内加权）。
 * 核心桶抽样已下沉到 pick-core 的 `pickInPool`（纯函数，单测复用同一实现）；
 * 此处只负责：applyFunnel（family 池内 funnel）+ 组装 region 生效条件 + BucketPickContext。
 *
 * @param avoidGroups 已见/最近/上一签的 canonicalGroup 集合——候选命中则 ×0.15 软避（§5.4）。
 */
function pickOneMain(
  pool: Food[],
  filters: Filters,
  region: RegionKey,
  avoidIds: Set<string>,
  recentIds: Set<string>,
  affinity: ReturnType<typeof getAffinity>,
  avoidGroups: Set<string>,
  meal: MealType,
): Food {
  const funnel = applyFunnel(pool, filters);
  const regionActive =
    region !== "all" &&
    (filters.families.length === 0 || filters.families.includes("chinese"));
  return pickInPool(funnel, filters.budget, {
    region,
    regionActive,
    mood: filters.mood,
    affinity,
    avoidIds,
    recentIds,
    avoidGroups,
    meal, // 下午茶特判：treat 免 satiety 惩罚 + 关闭 role main 偏向（见 bucketCandidateWeight）
  });
}

export function useDivinationPick() {
  // 抽中的那道菜（null = 还没占）
  const [pick, setPick] = useState<Food | null>(null);
  // 正在解析定位 + 校验可用性的过渡态
  const [verifying, setVerifying] = useState(false);
  // 最新抽中的镜像，供下一占算「避开上一签」（避免闭包拿旧值）
  const pickRef = useRef<Food | null>(null);
  // reset/卸载后，旧定位和可用性查询只能结束，不能重新填回结果。
  const castIdRef = useRef(0);
  useEffect(
    () => () => {
      castIdRef.current++;
    },
    [],
  );

  // 餐段：默认稳定值避免水合不一致，挂载后按真实时间校正
  const [meal, setMeal] = useState<MealType>("lunch");
  useEffect(() => {
    setMeal(getCurrentMeal(new Date()));
  }, []);

  // 口味地区 + 漏斗筛选：默认值，挂载后从 localStorage 恢复（跨会话记住用户口味）
  const [region, setRegionState] = useState<RegionKey>("all");
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  useEffect(() => {
    try {
      const savedRegion = localStorage.getItem(REGION_STORAGE_KEY);
      // 脏值防线：只接受合法 RegionKey，否则回 "all"（详见 pick-core normalizeRegion）。
      if (savedRegion !== null) setRegionState(normalizeRegion(savedRegion));
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        // 只接受合法 enum / 数组成员，非法字段静默回默认——绝不把脏值漏进抽取核心。
        setFiltersState(normalizeFilters(JSON.parse(savedFilters)));
      }
    } catch {
      // localStorage 不可用（隐私模式等）或 JSON 解析失败时忽略，用默认
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
      const requestId = ++castIdRef.current;
      const fresh = () => requestId === castIdRef.current;
      try {
        // tea 走三池并集（meal+side+drink），其它餐段纯 meal 层——只此一处判 tea（§3.1）。
        const base = foodsByMealForSinglePick(meal);
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

        // canonicalGroup 软避：已见/最近/上一签 命中过的族，桶内 ×0.15（§5.4，防连占刷屏同类）。
        // ⚠️ 用全局 id→group 映射，不用当前 base 反查——recent 可能是别餐段吃过的同组菜，
        // 不在当前池里，用 base 会查不到、跨餐段软避静默失效（Codex P2）。
        const avoidGroups = new Set<string>();
        const addGroup = (id: string) => {
          const g = canonicalGroupOfFoodId(id);
          if (g) avoidGroups.add(g);
        };
        seen.forEach(addGroup);
        recentIds.forEach(addGroup);
        avoidIds.forEach(addGroup);

        const settle = (food: Food): CastResult => {
          if (!fresh()) return { food: null, exhausted: false };
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
        if (!fresh()) return { food: null, exhausted: false };

        if (!coords) {
          setVerifying(false);
          // 无坐标：直接在「没见过的」里加权抽，不重复。
          return settle(
            pickOneMain(
              unseen,
              filters,
              region,
              avoidIds,
              recentIds,
              affinity,
              avoidGroups,
              meal,
            ),
          );
        }

        // —— 有坐标：在「没见过的」里优先选附近的（可用性是偏好，不破坏去重）——
        const MAX_ROUNDS = 6;
        let chosen: Food | null = null;
        for (let round = 0; round < MAX_ROUNDS; round++) {
          // 可用性预过滤作用在 unseen 上：内部空了退回 unseen（绝不退回见过的）。
          const p = prefilterByAvailability(unseen, coords);
          const candidate = pickOneMain(
            p,
            filters,
            region,
            avoidIds,
            recentIds,
            affinity,
            avoidGroups,
            meal,
          );
          const bad = await unavailableKeywords([candidate], coords);
          if (!fresh()) return { food: null, exhausted: false };
          chosen = candidate; // 兜底留着最后一道（仍 ∈ unseen，不会重复）
          if (bad.size === 0) break; // 附近买得到，定了
          // 买不到：结果已落缓存，下一轮 prefilter 自动排除
        }

        setVerifying(false);
        return chosen ? settle(chosen) : { food: null, exhausted: false };
      } finally {
        if (fresh()) setVerifying(false);
      }
    },
    [meal, filters, region],
  );

  /** 复位：清空抽中的菜（回到「未占」） */
  const reset = useCallback(() => {
    castIdRef.current++;
    setVerifying(false);
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
