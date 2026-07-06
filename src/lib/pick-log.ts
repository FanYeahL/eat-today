"use client";

/**
 * 抽签埋点（pick-log）
 * ─────────────────────────────────────────────
 * 目的：验证「实体模型该怎么定」——只记录、不改任何抽签/筛选行为。
 *
 * 记录每次「抽中一道 → 用户对它的处置」，关键是算【接受率】而非曝光量：
 *   曝光量 = 池子占比 × 模型偏好，天然带偏（dish 占 68% 自然被抽得多）；
 *   接受率 = 在某 entityType 被抽中的前提下，用户留下 vs 换掉的比例，是不受占比影响的纯信号。
 * 几天后按 entityType 拉接受率，就能回答「brand/dish_group/dining_style 用户到底爱不爱」，
 * 而不是靠猜。这一步只攒数据，产品决策（谁进主抽签）留给人工看完数据再定。
 *
 * 设计纪律（同 diary）：纯 localStorage、不碰后端、全部容错（隐私模式/损坏→安全退化）。
 */

import type { EntityType, PriceTier } from "@/types/food";

const STORAGE_KEY = "foodie:picklog";

/** 用户对一次抽中的处置 */
export type PickAction = "accept" | "reroll";

/** 一条抽签记录：抽中了什么实体、当时什么预算、用户怎么处置 */
export interface PickLogEntry {
  /** 时间戳（毫秒） */
  ts: number;
  /** 抽中那道菜的 id（便于回溯到具体菜） */
  foodId: string;
  /** 抽中那道菜的名字（人看日志方便） */
  name: string;
  /** 抽中那道菜的实体类型——核心维度 */
  entityType: EntityType;
  /** 抽中那道菜的价位档（只记录，不参与决策） */
  priceTier: PriceTier;
  /** 抽签时的预算偏好（any/budget/normal/treat），用于切「brand-in-treat」这类条件 */
  budget: string;
  /** 用户处置：accept=留下/定了 ; reroll=换一道/跳过 */
  action: PickAction;
}

/** 读全部记录（时间升序）。任何异常退化为空数组。 */
export function getPickLog(): PickLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is PickLogEntry =>
        !!e &&
        typeof (e as PickLogEntry).ts === "number" &&
        typeof (e as PickLogEntry).entityType === "string" &&
        ((e as PickLogEntry).action === "accept" ||
          (e as PickLogEntry).action === "reroll"),
    );
  } catch {
    return [];
  }
}

/**
 * 记一条抽签处置。now 由调用方传入（与 diary 一致，便于测试 / 避免水合问题）。
 * 写失败（满了/隐私模式）静默忽略，绝不影响主流程。
 */
export function logPick(
  food: { id: string; name: string; entityType: EntityType; priceTier: PriceTier },
  budget: string,
  action: PickAction,
  now: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const log = getPickLog();
    log.push({
      ts: now,
      foodId: food.id,
      name: food.name,
      entityType: food.entityType,
      priceTier: food.priceTier,
      budget,
      action,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // 忽略写入失败
  }
}

/** 清空埋点（调试/重新收集用） */
export function clearPickLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}

/** 按 entityType 聚合的接受率统计 */
export interface AcceptanceStat {
  entityType: EntityType;
  shown: number; // 被抽中（accept + reroll）次数
  accepted: number; // 留下次数
  acceptRate: number; // accepted / shown
}

/**
 * 按 entityType 算接受率——人工看数据时用。
 * 可选 budget 过滤，切「想吃好的时 brand 接受率」这类条件信号。
 */
export function acceptanceByEntity(budget?: string): AcceptanceStat[] {
  const log = getPickLog();
  const agg = new Map<EntityType, { shown: number; accepted: number }>();
  for (const e of log) {
    if (budget && e.budget !== budget) continue;
    const a = agg.get(e.entityType) ?? { shown: 0, accepted: 0 };
    a.shown++;
    if (e.action === "accept") a.accepted++;
    agg.set(e.entityType, a);
  }
  return Array.from(agg.entries()).map(([entityType, a]) => ({
    entityType,
    shown: a.shown,
    accepted: a.accepted,
    acceptRate: a.shown > 0 ? a.accepted / a.shown : 0,
  }));
}
