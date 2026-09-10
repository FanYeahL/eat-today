import type { Filters } from "./pick-core";
import type { CuisineFamily } from "@/types/food";

type Option<Key extends string> = { key: Key; label: string; emoji: string };
const MOODS: Option<Filters["mood"]>[] = [
  { key: "any", label: "不挑心情", emoji: "🤙" },
  { key: "spicy", label: "想吃点辣的", emoji: "🌶️" },
  { key: "mild", label: "淡淡的就好", emoji: "🌿" },
  { key: "meat", label: "大口吃肉", emoji: "🍖" },
  { key: "light", label: "控卡轻食", emoji: "🥗" },
];
const BUDGETS: Option<Filters["budget"]>[] = [
  { key: "any", label: "不限预算", emoji: "💸" },
  { key: "budget", label: "随便吃点", emoji: "🪙" },
  { key: "normal", label: "正常水平", emoji: "💵" },
  { key: "treat", label: "想吃好的", emoji: "💎" },
];
const WATER_MOOD_LABELS: Partial<Record<Filters["mood"], string>> = {
  any: "都行",
  spicy: "想吃点辣的开胃",
  meat: "狠狠大口吃肉",
  light: "控卡自律中",
};

/** 显式保留主题文案；选项身份与顺序只有一个来源。 */
export function filterOptions(theme: "picker" | "water") {
  return {
    moods: MOODS.map((item) => ({
      ...item,
      label:
        theme === "water"
          ? (WATER_MOOD_LABELS[item.key] ?? item.label)
          : item.label,
    })),
    budgets: BUDGETS.map((item) => ({
      ...item,
      label: theme === "water" && item.key === "any" ? "不限" : item.label,
    })),
  };
}

export function toggleFilterFamily(
  value: Filters,
  family: CuisineFamily,
): Filters {
  return {
    ...value,
    families: value.families.includes(family)
      ? value.families.filter((f) => f !== family)
      : [...value.families, family],
  };
}
export function showsRegion(value: Filters): boolean {
  return value.families.length === 0 || value.families.includes("chinese");
}
