import type { Shop } from "@/types/shop";
import { isRecord } from "./food-validation";

/** 高德缺失字段可能为 []，仅接收非空字符串。 */
export function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function finiteNumber(value: unknown): number | null {
  const raw = str(value);
  if (raw === null) return null;
  const result = Number(raw);
  return Number.isFinite(result) ? result : null;
}

function locationOf(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length !== 2 || parts.some((p) => !p.trim())) return null;
  const [lng, lat] = parts.map(Number);
  return Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lng) <= 180 &&
    Math.abs(lat) <= 90
    ? `${lng},${lat}`
    : null;
}

/** 有效 id 优先；缺 id 时按位置（再按地址）生成稳定标识，资料不足不展示。 */
export function toShop(poi: Record<string, unknown>): Shop | null {
  const name = str(poi.name);
  if (!name) return null;
  const location = locationOf(poi.location);
  const address = str(poi.address);
  const id =
    str(poi.id) ??
    (location
      ? `fallback:location:${JSON.stringify([name, location])}`
      : address
        ? `fallback:address:${JSON.stringify([name, address])}`
        : null);
  if (!id) return null;
  const bizExt = isRecord(poi.biz_ext) ? poi.biz_ext : {};
  const distance = finiteNumber(poi.distance);
  const rating = finiteNumber(bizExt.rating);
  return {
    id,
    name,
    address: address ?? "地址信息缺失",
    distance: distance !== null && distance >= 0 ? distance : null,
    rating: rating !== null && rating >= 0 ? rating : null,
    tel: str(poi.tel),
    location: location ?? "",
    category: categoryOf(poi),
  };
}

/** 原始顺序保留，严格层优先；去重集合可跨两个展示层共享。 */
export function normalizeShops(
  pois: Record<string, unknown>[],
  seen = new Set<string>(),
): Shop[] {
  const shops: Shop[] = [];
  for (const poi of pois) {
    const shop = toShop(poi);
    if (!shop || seen.has(shop.id)) continue;
    seen.add(shop.id);
    shops.push(shop);
  }
  return shops;
}

/**
 * 从高德 type 提炼「店类型」短标签，给第二层扩展推荐展示。
 * 高德 type 是「大类;中类;小类」三级（如「餐饮服务;快餐厅;快餐厅」），
 * 取中段最具体且对用户有意义——「快餐厅 / 咖啡厅 / 糕饼店 / 甜品店」。
 * 中段是泛词（餐饮相关场所/餐饮相关）时退到小段，仍泛就返回 null（不硬贴标签）。
 */
const VAGUE_CATEGORY = new Set(["餐饮相关场所", "餐饮相关", "餐饮服务", ""]);
function categoryOf(poi: Record<string, unknown>): string | null {
  const type = str(poi.type);
  if (!type) return null;
  const segs = type.split(";").map((s) => s.trim());
  // 优先中段，泛词则退小段
  const mid = segs[1] ?? "";
  if (mid && !VAGUE_CATEGORY.has(mid)) return mid;
  const last = segs[segs.length - 1] ?? "";
  if (last && !VAGUE_CATEGORY.has(last)) return last;
  return null;
}
