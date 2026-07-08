"use client";

/**
 * 常客信号（隐式个性化）
 * 不让用户填表单，让 app 自己学：你在结果里点进哪家店（ShopCard 跳高德那下），
 * 就是一次真实的「我想去这家」意图。反复点同一家 → 它成了你的常客。
 *
 * 两层用途：
 * 1. 看得见：攒够信号后，觅食准备页浮现「最近常翻：店A · 店B」。零冷启动——没料不出现。
 * 2. 看不见（更重要）：常客对应的【菜 / 菜系】喂进共振算法加权，熟悉口味出镜率调高，
 *    但不另起抓阄模式，共振 / 搭配 / 变化全保留。
 *
 * 诚实边界：点店 ≠ 一定吃了，是【意图代理】，有噪。所以加权是软的、封顶的，
 * 常客只是把概率往熟悉的方向推，绝不盖掉整个池子。
 *
 * 纯 localStorage，全部容错；存储封顶防膨胀。
 */

import type { CuisineKey, FoodKind } from "@/types/food";

const STORAGE_KEY = "foodie:visits";
const MAX_EVENTS = 300; // 事件上限，超了丢最旧
const KEEP_DAYS = 30; // 只保留近 30 天
const DAY_MS = 24 * 60 * 60 * 1000;

/** 近 14 天窗口：口味亲和统计的时间基准（getAffinity 用 REGULAR_DAYS*2） */
const REGULAR_DAYS = 14;

/** 一次点店事件：点进了某家店，带当时在看的那道菜的上下文 */
export interface VisitEvent {
  /** 高德 POI id，店铺唯一标识 */
  shopId: string;
  /** 店名（展示用） */
  shopName: string;
  /** 当时在看的菜 id */
  foodId: string;
  /** 那道菜的菜系（菜系级加权用） */
  cuisine: CuisineKey;
  /** 主食 / 饮品（只让主食参与口味加权，饮品地域性弱不掺） */
  kind: FoodKind;
  /** 时间戳（毫秒） */
  ts: number;
}

/** 读全部事件（升序）。任何异常退化为空。 */
function getEvents(): VisitEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is VisitEvent =>
        !!e &&
        typeof (e as VisitEvent).shopId === "string" &&
        typeof (e as VisitEvent).ts === "number",
    );
  } catch {
    return [];
  }
}

/** 记一次点店。now 由调用方传入。带裁剪：丢超 30 天的、超 300 条的最旧。 */
export function recordVisit(
  ev: Omit<VisitEvent, "ts">,
  now: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const cutoff = now - KEEP_DAYS * DAY_MS;
    const events = getEvents().filter((e) => e.ts >= cutoff);
    events.push({ ...ev, ts: now });
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // 写不进就算了，不影响主流程
  }
}

/**
 * 口味亲和：从点店历史聚合出「对某道菜 / 某菜系」的熟悉度倍数。
 * 只看主食（kind==="main"）的点击——饮品地域性弱，不掺。
 * 用 distinct 店铺数衡量「常翻强度」：在 3 家不同川菜馆都点过，比在同一家点 3 次更能说明你爱川菜。
 */
export interface Affinity {
  /** foodId → 倍数（≥1） */
  byFood: Record<string, number>;
  /** cuisine → 倍数（≥1） */
  byCuisine: Record<string, number>;
}

/** 把 distinct 店铺数映射成倍数（软、封顶），count 越多越熟悉但收益递减 */
function foodBoost(distinctShops: number): number {
  if (distinctShops <= 0) return 1;
  if (distinctShops === 1) return 1.5;
  if (distinctShops === 2) return 1.9;
  return 2.2; // 封顶
}
function cuisineBoost(distinctShops: number): number {
  if (distinctShops <= 0) return 1;
  if (distinctShops === 1) return 1.25;
  if (distinctShops === 2) return 1.5;
  if (distinctShops === 3) return 1.7;
  return 1.9; // 封顶
}

/**
 * 算亲和表。now 传入；只统计近 REGULAR_DAYS*2 天（口味偏好比常客判定看得久一点）。
 * 用 distinct shopId 去重：同一家店点多次只算一次「广度」。
 */
export function getAffinity(now: number): Affinity {
  const cutoff = now - REGULAR_DAYS * 2 * DAY_MS;
  // food/cuisine → 该项下出现过的 distinct shopId 集合
  const foodShops = new Map<string, Set<string>>();
  const cuisineShops = new Map<string, Set<string>>();

  for (const e of getEvents()) {
    if (e.ts < cutoff || e.kind !== "main") continue;
    if (!foodShops.has(e.foodId)) foodShops.set(e.foodId, new Set());
    foodShops.get(e.foodId)!.add(e.shopId);
    if (!cuisineShops.has(e.cuisine)) cuisineShops.set(e.cuisine, new Set());
    cuisineShops.get(e.cuisine)!.add(e.shopId);
  }

  const byFood: Record<string, number> = {};
  Array.from(foodShops.entries()).forEach(([foodId, shops]) => {
    const b = foodBoost(shops.size);
    if (b > 1) byFood[foodId] = b;
  });
  const byCuisine: Record<string, number> = {};
  Array.from(cuisineShops.entries()).forEach(([cuisine, shops]) => {
    const b = cuisineBoost(shops.size);
    if (b > 1) byCuisine[cuisine] = b;
  });

  return { byFood, byCuisine };
}

/** 空亲和（无个性化），降级 / SSR 用 */
export const EMPTY_AFFINITY: Affinity = { byFood: {}, byCuisine: {} };
