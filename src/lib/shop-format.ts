import type { Shop } from "@/types/shop";

/** 两套店卡共用的数据，主题不参与归一化。 */
export interface ShopPresentation {
  id: string;
  name: string;
  emoji: string;
  distance: string;
  location: string;
  tier: "strict" | "expansion";
  category: string | null;
}

export function fmtDistance(distance: number | null): string {
  if (distance === null || !Number.isFinite(distance) || distance < 0)
    return "";
  return distance >= 1000
    ? `${(distance / 1000).toFixed(1)}km`
    : `${distance}m`;
}

export function toShopCards(
  shops: Shop[],
  emoji: string,
  tier: ShopPresentation["tier"] = "strict",
): ShopPresentation[] {
  return shops.map((shop) => ({
    id: shop.id,
    name: shop.name,
    emoji,
    distance: fmtDistance(shop.distance),
    location: shop.location,
    tier,
    category: shop.category ?? null,
  }));
}
