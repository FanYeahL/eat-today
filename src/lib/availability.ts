/**
 * 附近可用性缓存
 * 摇老虎机之前，先确认「这道菜附近买不买得到」，只让买得到的进转盘，
 * 避免抽到没地方吃、被迫进「自己做」环节。
 *
 * 关键设计：按【关键词】缓存，不是按【菜】。
 * 很多菜共享同一个查店关键词（如 11 道零食都搜「便利店」、7 道日料都搜「日式料理」），
 * 查过一次整组都知道了。一个 session 内每个关键词最多查一次高德，越摇越快、最省额度。
 */

import type { Coords } from "@/lib/geo";
import type { Food } from "@/types/food";
import { cuisineKeyword } from "@/config/cuisine";

/**
 * 一道菜查店时实际用的关键词：优先 shopKeyword，否则回落到【所属菜系的店铺类型词】。
 * 与探店查店（DriftCards / useShops）保持一致。
 *
 * 关键：不再拿菜名硬搜。回锅肉没有 shopKeyword → 回落「川菜」（川渝店类型词），
 * 问的是「附近有没有川菜馆」，而不是「有没有店招写着回锅肉」——后者几乎必然搜不到，
 * 会把菜误判成「附近没有」永久踢出池子（只剩火锅那种菜名即店招的能活，导致老摇出火锅）。
 * availability 判断的是「这类餐厅存在性」，不是「某道代表菜的存在性」，店类型词命中最稳。
 * 同菜系多道菜共享同一把钥匙，缓存命中率也更高（整组川菜查一次就够）。
 */
export function keywordOf(food: Food): string {
  return food.shopKeyword ?? cuisineKeyword(food.cuisine);
}

/**
 * 坐标量化成网格 key（约 ~1km）。
 * 用户在城里走动几百米不该让整张缓存失效；但跨城了就该重查。
 * 0.01 度 ≈ 1.1km，够稳又不过期太频繁。
 */
function gridKey(coords: Coords): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  return `${round(coords.lng)},${round(coords.lat)}`;
}

// 缓存：网格 → (关键词 → 附近是否有店)。换了网格自然是另一张表。
const cache = new Map<string, Map<string, boolean>>();
// 进行中的查询：同一 (网格,关键词) 并发只打一次高德。
const inflight = new Map<string, Promise<boolean>>();

function tableFor(coords: Coords): Map<string, boolean> {
  const gk = gridKey(coords);
  let table = cache.get(gk);
  if (!table) {
    table = new Map();
    cache.set(gk, table);
  }
  return table;
}

/**
 * 查单个关键词在该坐标附近是否有店（带缓存 + 并发合流）。
 * 网络/接口出错时 fail-open 返回 true——宁可偶尔放过一个买不到的，
 * 也不能因为高德抽风把整池菜误判成「附近都没有」让人摇不出东西。
 */
export async function checkKeyword(
  keyword: string,
  coords: Coords,
): Promise<boolean> {
  const table = tableFor(coords);
  const hit = table.get(keyword);
  if (hit !== undefined) return hit;

  const flightKey = `${gridKey(coords)}|${keyword}`;
  const existing = inflight.get(flightKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const params = new URLSearchParams({
        keyword,
        lng: String(coords.lng),
        lat: String(coords.lat),
        count: "1",
      });
      const res = await fetch(`/api/shops?${params.toString()}`);
      if (!res.ok) return true; // fail-open
      const data = (await res.json()) as { count?: number };
      const available = (data.count ?? 0) > 0;
      table.set(keyword, available); // 只在成功拿到结果时落缓存
      return available;
    } catch {
      return true; // fail-open
    } finally {
      inflight.delete(flightKey);
    }
  })();

  inflight.set(flightKey, promise);
  return promise;
}

/**
 * 同步读已缓存的可用性，不发请求。
 * undefined = 还没查过；true/false = 查过的结果。
 * 给抽取逻辑预过滤池子用（已知不可用的先排除，未知的留着摇到再校验）。
 */
export function cachedAvailability(
  keyword: string,
  coords: Coords,
): boolean | undefined {
  return cache.get(gridKey(coords))?.get(keyword);
}
