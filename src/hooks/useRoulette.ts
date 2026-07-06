"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mainFoodsByMeal, drinkFoodsByMeal } from "@/config/foods";
import { getCurrentMeal } from "@/config/meals";
import { resolveCoords, type Coords } from "@/lib/geo";
import { addEntry, recentFoodIds } from "@/lib/diary";
import { getAffinity, type Affinity } from "@/lib/regulars";
import { cuisineAffinity, drinkPairingWeight } from "@/config/cuisine";
import {
  type Filters,
  DEFAULT_FILTERS,
  regionWeight,
  budgetWeight,
  richnessWeight,
  moodWeight,
  applyFunnel,
  applyFamily,
  pickBy,
  seedAvoidFactor,
  familiarFactor,
  prefilterByAvailability,
  unavailableKeywords,
} from "@/lib/pick-core";
import type { Food, MealType, RegionKey } from "@/types/food";

// Filters 从 pick-core 收口（单一数据源），此处 re-export 保持既有引用不变。
export type { Filters } from "@/lib/pick-core";

const REGION_STORAGE_KEY = "foodie:region";
const FILTERS_STORAGE_KEY = "foodie:filters";

/** 一次摇出的套餐：两道主食 + 一杯饮品 */
export interface RouletteResult {
  /** 前两轴：两道互不相同的主食（轴1 主打 + 轴2 最佳拍档） */
  mains: [Food, Food];
  /** 第三轴：一杯饮品 */
  drink: Food;
}

export type RouletteStatus = "idle" | "spinning" | "done";

/**
 * 共振抽取：三轴联动出一套「懂你」的干饭组合。
 * - 轴1 主打：漏斗子池里按 region 加权 + 偏 role==="main"，抽 mainA。
 * - 轴2 最佳拍档：以 mainA 为锚，按「菜系相容度 × 偏 snack × emoji 不同」加权，
 *   逐级降级（同菜系→相容→任意），永不空池。
 * - 轴3 惊艳配角：以前两轴口味为锚，按 pairingRules（解辣/解腻）加权抽饮品。
 * region 仅在风味家族含 chinese（或不限）时才真正生效。
 */
function resonate(
  mainPool: Food[],
  drinkPool: Food[],
  filters: Filters,
  region: RegionKey,
  seedIds: Set<string>,
  avoidMains: Set<string>,
  avoidDrink: Set<string>,
  recentIds: Set<string>,
  affinity: Affinity,
): RouletteResult {
  const funnelMains = applyFunnel(mainPool, filters);
  // region 只在「不限家族」或「家族含中式」时参与，避免选了日韩还按川渝加权
  const regionActive =
    region !== "all" &&
    (filters.families.length === 0 || filters.families.includes("chinese"));

  // —— 轴1 主打 ——
  const mainA = pickBy(funnelMains, (f) => {
    let w = regionActive ? regionWeight(f, region) : 1;
    w *= budgetWeight(f, filters.budget); // 预算偏好（不硬过滤）
    w *= richnessWeight(f, filters.budget); // 丰盛度偏好（治「想吃好的」抽出轻食）
    w *= moodWeight(f, filters.mood); // 心情偏好（不硬过滤）
    if (f.role === "main") w *= 1.6; // 轴1 偏正餐
    w *= familiarFactor(f, affinity); // 常客熟悉度
    return w * seedAvoidFactor(f.id, seedIds, avoidMains, recentIds);
  });

  // —— 轴2 最佳拍档（以 mainA 为锚的条件池）——
  // others：池里除 mainA 之外的全部（结构上保证 mainB.id !== mainA.id）。
  // 在此之上优先 emoji 也不同；坍缩到 emoji 无可选时放开 emoji 去重、但仍守住 id 不同；
  // 仅当池子真的只剩 mainA 这一道菜（others 为空）时，才退而允许 mainB===mainA。
  const others = funnelMains.filter((f) => f.id !== mainA.id);
  const diffEmoji = others.filter((f) => f.emoji !== mainA.emoji);
  const axis2Pool =
    diffEmoji.length > 0 ? diffEmoji : others.length > 0 ? others : [mainA];
  const mainB = pickBy(axis2Pool, (f) => {
    let w = cuisineAffinity(mainA.cuisine, f.cuisine); // 0.1~1 共振核心
    if (f.role === "snack") w *= 1.8; // 轴2 偏轻小吃，正餐+小吃更像人点的
    if (regionActive) w *= regionWeight(f, region);
    w *= budgetWeight(f, filters.budget); // 预算偏好（与轴1 一致）
    w *= richnessWeight(f, filters.budget); // 丰盛度偏好（与轴1 一致）
    w *= moodWeight(f, filters.mood); // 心情偏好（与轴1 一致）
    w *= familiarFactor(f, affinity); // 常客熟悉度
    return w * seedAvoidFactor(f.id, seedIds, avoidMains, recentIds);
  });

  // —— 轴3 惊艳配角（饮品，按前两轴口味共振）——
  // 饮品不做家族硬过滤（地域性弱），预算改为偏好权重（不硬砍），心情不约束饮品。
  const maxSpicy = Math.max(mainA.spicy, mainB.spicy);
  const greasy = [mainA, mainB].some(
    (f) => f.tags.includes("高热量") && !f.tags.includes("健康轻食"),
  );
  const drink = pickBy(drinkPool, (f) => {
    let w = drinkPairingWeight(f.tags, { maxSpicy, greasy });
    w *= budgetWeight(f, filters.budget); // 预算偏好
    return w * seedAvoidFactor(f.id, seedIds, avoidDrink, recentIds);
  });

  return { mains: [mainA, mainB], drink };
}

/**
 * 干饭老虎机逻辑 hook
 * 把「漏斗筛选 + 共振抽取 + 候选篮 + 种草 + 状态流转」从 UI 抽离。
 */
export function useRoulette() {
  const [status, setStatus] = useState<RouletteStatus>("idle");
  const [result, setResult] = useState<RouletteResult | null>(null);
  // 每次开摇递增，传给滚轮强制重新播放动画。放 hook 里，因为开摇是异步的，
  // 要等可用性校验完成、结果定下来的同一刻才 +1。
  const [spinId, setSpinId] = useState(0);
  // 正在「看看附近有什么」——解析定位 + 校验可用性的过渡态，按钮置灰用。
  const [verifying, setVerifying] = useState(false);
  // 最新结果的镜像，供异步 spin 算「避开上一轮」用（避免闭包拿到旧值）。
  const resultRef = useRef<RouletteResult | null>(null);

  // 候选篮：用户单独挑中的食物（不再是整套）；confirmed 后铺出全部
  const [candidates, setCandidates] = useState<Food[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  // 好友种草来的高概率候选食物 id（接口保留，当前无入口）
  const [seedIds, setSeedIds] = useState<Set<string>>(new Set());

  // 餐段：默认稳定值避免水合不一致，挂载后按真实时间校正
  const [meal, setMeal] = useState<MealType>("lunch");
  useEffect(() => {
    setMeal(getCurrentMeal(new Date()));
  }, []);

  // 口味地区（中餐二级）：默认「都行」，挂载后从 localStorage 恢复
  const [region, setRegionState] = useState<RegionKey>("all");
  // 漏斗筛选：默认不限，挂载后恢复
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

  // 当前餐段的两个池
  const mainPool = useMemo(() => mainFoodsByMeal(meal), [meal]);
  const drinkPool = useMemo(() => drinkFoodsByMeal(meal), [meal]);

  /**
   * 开摇：先确认附近买得到，只让买得到的进转盘。
   * 1. 解析定位坐标（共享缓存，不重复弹权限）。拿不到 → 降级：不过滤，按老逻辑摇。
   * 2. 有坐标时拒绝采样：抽一套 → 并行查这三样附近有没有 → 哪样没有就把它的
   *    关键词拉黑、预过滤池子重抽，最多 6 轮。拉黑的是「关键词」（整组），收敛快。
   * 3. 定下结果同一刻 spinId+1 触发滚轮动画，进入 spinning。
   * 永不空池：每轮预过滤空了退回原池；6 轮还没全可用就用最后一套兜底（至少摇得出）。
   */
  const spin = useCallback(async () => {
    if (mainPool.length === 0 || drinkPool.length === 0) return;

    // ★ family 是硬墙，最先作用于主食池：之后可用性/避重都在「家族池」内做，
    //   空了只退回家族池、绝不退回全库（修「选了某家族却抽出别家族」的兜底漏洞）。
    //   饮品不做家族过滤（地域性弱，resonate 里本就家族无关）。
    const familyMains = applyFamily(mainPool, filters.families);

    const prev = resultRef.current;
    const avoidMains = new Set(prev ? prev.mains.map((f) => f.id) : []);
    const avoidDrink = new Set(prev ? [prev.drink.id] : []);
    // 看不见的避重：近几天吃过的温和降权（读日记，纯本地）
    const recentIds = recentFoodIds(Date.now());
    // 隐式个性化：常翻店对应的菜/菜系熟悉度加权（读点店历史，纯本地）
    const affinity = getAffinity(Date.now());

    const startSpin = (next: RouletteResult) => {
      resultRef.current = next;
      setResult(next);
      setSpinId((n) => n + 1);
      setStatus("spinning");
    };

    // —— 拿坐标：拿不到就降级，不按附近过滤，行为同从前 ——
    let coords: Coords | null = null;
    setVerifying(true);
    try {
      coords = await resolveCoords();
    } catch {
      coords = null; // 拒权限 / 非安全环境 / 超时：降级
    }

    if (!coords) {
      setVerifying(false);
      startSpin(
        resonate(
          familyMains,
          drinkPool,
          filters,
          region,
          seedIds,
          avoidMains,
          avoidDrink,
          recentIds,
          affinity,
        ),
      );
      return;
    }

    // —— 有坐标：拒绝采样，拉黑买不到的关键词重抽 ——
    const MAX_ROUNDS = 6;
    let chosen: RouletteResult | null = null;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const mp = prefilterByAvailability(familyMains, coords);
      // 饮品不做可用性预过滤：spin 从不校验饮品（遍地都有），而 prefilter 读的是
      // 按「关键词」共享的缓存——主食把某 cuisine 关键词标成附近没有，会连带把同关键词的
      // 饮品（如 cn-generic→家常菜）误踢出池。饮品按设计「永远可得」，直接用全量 drinkPool。
      const candidate = resonate(
        mp,
        drinkPool,
        filters,
        region,
        seedIds,
        avoidMains,
        avoidDrink,
        recentIds,
        affinity,
      );
      // 只校验两道主食，跳过饮品（遍地都有，省查询、压 QPS）。
      const bad = await unavailableKeywords(candidate.mains, coords);
      if (bad.size === 0) {
        chosen = candidate;
        break;
      }
      // 这一套有买不到的：记下来，下一轮 prefilter 会自动排除（结果已落缓存）。
      chosen = candidate; // 兜底留着最后一套
    }

    setVerifying(false);
    if (chosen) startSpin(chosen);
  }, [mainPool, drinkPool, filters, region, seedIds]);

  /** 滚轮全部停稳后调用，翻到 done */
  const finish = useCallback(() => {
    setStatus("done");
  }, []);

  /** 回到初始 hero；清空候选篮、种草与结果 */
  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    resultRef.current = null;
    setCandidates([]);
    setConfirmed(false);
    setSeedIds(new Set());
  }, []);

  // —— 候选篮操作（按单个食物） ——
  /** 切换某食物在候选篮里的去留（已在则移除，不在则加入；按 id 去重） */
  const toggleCandidate = useCallback((food: Food) => {
    setCandidates((prev) =>
      prev.some((f) => f.id === food.id)
        ? prev.filter((f) => f.id !== food.id)
        : [...prev, food],
    );
  }, []);

  /** 从候选篮移除某 id */
  const removeCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearBasket = useCallback(() => {
    setCandidates([]);
    setConfirmed(false);
  }, []);

  /** 点「定了」→ 记一笔干饭日记（纯本地），再铺出全部候选 */
  const confirmSelection = useCallback(() => {
    addEntry(candidates, meal, Date.now());
    setConfirmed(true);
  }, [candidates, meal]);

  /** 从汇总视图返回继续摇 */
  const unconfirm = useCallback(() => {
    setConfirmed(false);
  }, []);

  /**
   * 好友种草：把一组食物 id 设为高概率候选。
   * 切餐段时会被清掉（见下方 effect），避免跨餐段串味。
   */
  const seedCombo = useCallback((ids: string[]) => {
    setSeedIds(new Set(ids));
  }, []);

  // 切餐段时清掉种草（已不适用）。注意：不清 result——
  // 否则正在 done/spinning 时切餐段会让结果区整块消失（候选篮也跟着没）。
  // 留着上一轮结果做占位，下次「再摇三个」自然用新餐段的池子重抽。
  useEffect(() => {
    setSeedIds(new Set());
  }, [meal]);

  return {
    status,
    result,
    spin,
    spinId,
    verifying,
    finish,
    reset,
    meal,
    setMeal,
    region,
    setRegion,
    filters,
    setFilters,
    mainPool,
    drinkPool,
    // 候选篮 + 种草
    candidates,
    confirmed,
    toggleCandidate,
    removeCandidate,
    clearBasket,
    confirmSelection,
    unconfirm,
    seedCombo,
  };
}
