import { cuisineMeta } from "@/config/cuisine";
import { meals } from "@/config/meals";
import type {
  CuisineKey,
  FoodTag,
  MealType,
  PriceTier,
  EntityType,
} from "@/types/food";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
export function isTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isFinite(new Date(value).getTime())
  );
}
export function isCuisine(value: unknown): value is CuisineKey {
  return typeof value === "string" && Object.hasOwn(cuisineMeta, value);
}
export function isMeal(value: unknown): value is MealType {
  return meals.some((meal) => meal.type === value);
}
export const FOOD_TAGS = [
  "高热量",
  "清淡",
  "适合宿舍",
  "快手",
  "下饭",
  "健康轻食",
  "暖胃",
  "高蛋白",
  "解馋",
  "省钱",
  "提神",
  "续命",
  "解腻",
] as const satisfies readonly FoodTag[];
export function isFoodTag(value: unknown): value is FoodTag {
  return FOOD_TAGS.some((tag) => tag === value);
}
export function isPriceTier(value: unknown): value is PriceTier {
  return value === "budget" || value === "normal" || value === "treat";
}
export function isEntityType(value: unknown): value is EntityType {
  return (
    value === "dish" ||
    value === "dish_group" ||
    value === "dining_style" ||
    value === "brand"
  );
}
