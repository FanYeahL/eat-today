"use client";

/**
 * 干饭日记
 * 用户每次「定了」就顺手记一笔——记录是摇号决策的免费副产品，零负担。
 * 纯 localStorage，不碰后端。存【结构化数据】（不是字符串），
 * 因为每道菜带 cuisine/spicy/tags，日记才能算出「最懂你的品类」「最近顿顿辣」
 * 这种像朋友一样的轻提醒，而不是干巴巴的计数。
 *
 * 设计纪律：
 * - 口径只增不减，绝不做「连续打卡 streak」——断一天就生愧疚，casual 工具最忌。
 * - 全部容错：localStorage 不可用（隐私模式）/ 数据损坏都安全退化为「空日记」。
 */

import { familyOf } from "@/config/cuisine";
import type {
  CuisineKey,
  CuisineFamily,
  FoodTag,
  MealType,
  Food,
} from "@/types/food";

const STORAGE_KEY = "foodie:diary";
/** 历史避重默认回看天数 */
export const RECENT_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 日记里一道菜的精简快照（够算统计 + 够展示，不存整个 Food） */
export interface DiaryFood {
  id: string;
  name: string;
  emoji: string;
  cuisine: CuisineKey;
  spicy: number;
  tags: FoodTag[];
}

/** 一条干饭记录：一次「定了」对应一条，含当时挑中的全部菜 */
export interface DiaryEntry {
  /** 决策时间戳（毫秒） */
  ts: number;
  /** 当时的餐段 */
  meal: MealType;
  /** 挑中的菜（精简快照） */
  items: DiaryFood[];
}

/** 把 Food 压成日记快照 */
function toDiaryFood(f: Food): DiaryFood {
  return {
    id: f.id,
    name: f.name,
    emoji: f.emoji,
    cuisine: f.cuisine,
    spicy: f.spicy,
    tags: f.tags,
  };
}

/** 读全部记录（按时间升序）。任何异常都退化为空数组。 */
export function getEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // 粗校验，挡掉损坏数据
    return parsed.filter(
      (e): e is DiaryEntry =>
        !!e &&
        typeof (e as DiaryEntry).ts === "number" &&
        Array.isArray((e as DiaryEntry).items),
    );
  } catch {
    return [];
  }
}

/**
 * 记一笔。now 由调用方传入（避免在工具层直接 new Date 便于测试）。
 * 同一餐段短时间内重复「定了」不去重——用户改主意再定也是真实决策。
 */
export function addEntry(foods: Food[], meal: MealType, now: number): void {
  if (typeof window === "undefined" || foods.length === 0) return;
  try {
    const entries = getEntries();
    entries.push({ ts: now, meal, items: foods.map(toDiaryFood) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 写不进去（满了 / 隐私模式）就算了，不影响主流程
  }
}

/** 清空日记（设置里给用户一个「重新开始」的出口用） */
export function clearDiary(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}

/**
 * 近 N 天吃过的菜 id 集合，给老虎机「看不见的避重」用。
 * now 传入便于一致性；默认回看 RECENT_DAYS 天。
 */
export function recentFoodIds(now: number, days = RECENT_DAYS): Set<string> {
  const cutoff = now - days * DAY_MS;
  const ids = new Set<string>();
  for (const e of getEntries()) {
    if (e.ts >= cutoff) {
      for (const f of e.items) ids.add(f.id);
    }
  }
  return ids;
}

/** 日记统计结果（首页看板用） */
export interface DiaryStats {
  /** 有没有任何记录 */
  hasData: boolean;
  /** 总决策次数（条目数） */
  total: number;
  /** 本月（自然月）决策次数 */
  thisMonth: number;
  /** 陪伴天数：首条记录到现在跨越的天数（至少 1） */
  companionDays: number;
  /** 最懂的风味家族 + 命中次数；无数据为 null */
  topFamily: { family: CuisineFamily; label: string; emoji: string; count: number } | null;
}

const FAMILY_LABEL: Record<CuisineFamily, { label: string; emoji: string }> = {
  chinese: { label: "中式", emoji: "🥢" },
  western: { label: "西餐", emoji: "🍝" },
  jpkr: { label: "日韩", emoji: "🍱" },
  exotic: { label: "异国", emoji: "🌍" },
};

/** 算看板统计。now 传入，避免水合不一致。 */
export function computeStats(now: number): DiaryStats {
  const entries = getEntries();
  if (entries.length === 0) {
    return { hasData: false, total: 0, thisMonth: 0, companionDays: 1, topFamily: null };
  }

  const nowDate = new Date(now);
  const y = nowDate.getFullYear();
  const m = nowDate.getMonth();

  let thisMonth = 0;
  const familyCount = new Map<CuisineFamily, number>();

  for (const e of entries) {
    const d = new Date(e.ts);
    if (d.getFullYear() === y && d.getMonth() === m) thisMonth++;
    for (const f of e.items) {
      const fam = familyOf(f.cuisine);
      familyCount.set(fam, (familyCount.get(fam) ?? 0) + 1);
    }
  }

  // 最懂的家族 = 命中最多的
  let topFamily: DiaryStats["topFamily"] = null;
  Array.from(familyCount.entries()).forEach(([family, count]) => {
    if (!topFamily || count > topFamily.count) {
      topFamily = { family, ...FAMILY_LABEL[family], count };
    }
  });

  const firstTs = entries[0].ts;
  const companionDays = Math.max(1, Math.floor((now - firstTs) / DAY_MS) + 1);

  return { hasData: true, total: entries.length, thisMonth, companionDays, topFamily };
}

/**
 * 一句温柔的轻提醒，从最近的吃饭模式里长出来（不是计数，是关心）。
 * 只读近一段时间的记录，挑一条最贴的；没料就返回 null（不硬凑）。
 * 纪律：只关心、不说教、不制造愧疚。
 */
export function gentleReminder(now: number): string | null {
  const entries = getEntries();
  if (entries.length < 3) return null; // 数据太少，别瞎评判

  const weekAgo = now - 7 * DAY_MS;
  const recent = entries.filter((e) => e.ts >= weekAgo);
  if (recent.length < 3) return null;

  const recentItems = recent.flatMap((e) => e.items);
  const n = recentItems.length;
  if (n === 0) return null;

  const spicyShare =
    recentItems.filter((f) => f.spicy >= 2).length / n;
  const lightShare =
    recentItems.filter(
      (f) => f.tags.includes("健康轻食") || f.tags.includes("清淡"),
    ).length / n;
  const heavyShare =
    recentItems.filter((f) => f.tags.includes("高热量")).length / n;

  // 顺序即优先级，挑第一条命中的
  if (spicyShare >= 0.6) {
    return "这一周吃得有点辣，胃还好吗？要不今天来点清淡的歇歇。";
  }
  if (lightShare === 0 && heavyShare >= 0.5) {
    return "最近顿顿挺顶的，今天加道清爽的，对自己好点。";
  }
  if (lightShare >= 0.6) {
    return "这阵子吃得挺克制，偶尔放纵一下也没关系～";
  }
  return null;
}
