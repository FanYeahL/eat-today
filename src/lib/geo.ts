/**
 * 共享定位模块
 * 把「浏览器定位 + 失败归因 + 坐标缓存」从 useShops 抽出来，
 * 让「查店铺」和「摇之前按附近过滤」共用同一次定位授权，
 * 不重复弹权限、不各存一份坐标。
 */

import { wgs84ToGcj02 } from "./gcj02";

/** 高德查询坐标：采集点已转换为 GCJ-02；粗略适用范围外保留 WGS-84。下游不得重复转换。 */
export type Coords = { lng: number; lat: number };

/** 定位失败时返回的具体原因，便于给用户精准提示 */
export type GeoReason =
  | "denied" // 权限被拒（浏览器或系统层面）
  | "unavailable" // 位置获取不到（系统定位服务关闭等）
  | "timeout" // 超时
  | "unsupported" // 浏览器不支持 / 非安全环境
  | null;

/** 定位缓存状态：未尝试 / 成功（带坐标）/ 不可用（带原因） */
type GeoCache =
  | { kind: "unknown" }
  | { kind: "ok"; coords: Coords }
  | { kind: "unavailable"; reason: GeoReason; retryAfter: number | null };

export const GEO_RETRY_MS = 30_000;

function failureExpired(): boolean {
  return (
    cache.kind === "unavailable" &&
    cache.retryAfter !== null &&
    Date.now() >= cache.retryAfter
  );
}

// 模块级单例缓存：整个页面生命周期共享一次定位结果。
let cache: GeoCache = { kind: "unknown" };
// 进行中的定位 Promise，避免并发调用同时弹两次权限。
let inflight: Promise<Coords> | null = null;

/** 把浏览器定位失败翻译成人话原因 */
function classifyGeoError(err: unknown): GeoReason {
  if (
    typeof GeolocationPositionError !== "undefined" &&
    err instanceof GeolocationPositionError
  ) {
    if (err.code === err.PERMISSION_DENIED) return "denied";
    if (err.code === err.POSITION_UNAVAILABLE) return "unavailable";
    if (err.code === err.TIMEOUT) return "timeout";
  }
  // 某些浏览器抛普通对象，按 code 兜底判断
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: number }).code;
    if (code === 1) return "denied";
    if (code === 2) return "unavailable";
    if (code === 3) return "timeout";
  }
  return "unsupported";
}

/** 包装浏览器定位为 Promise（reject 的值是 GeoReason 字符串） */
function getBrowserCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject("unsupported" as GeoReason);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          resolve(wgs84ToGcj02(pos.coords.longitude, pos.coords.latitude));
        } catch {
          reject("unavailable" satisfies GeoReason);
        }
      },
      (err) => reject(classifyGeoError(err)),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/**
 * 解析坐标：命中缓存直接返回，否则尝试定位一次并缓存。
 * - 成功：resolve 坐标。
 * - 失败：瞬时故障冷却 30 秒后允许重试；拒绝权限/不支持不自动重试。
 * 并发调用共享同一个 inflight Promise。
 */
export function resolveCoords(): Promise<Coords> {
  if (failureExpired()) cache = { kind: "unknown" };
  if (cache.kind === "ok") return Promise.resolve(cache.coords);
  if (cache.kind === "unavailable") {
    return Promise.reject(cache.reason);
  }
  if (inflight) return inflight;

  inflight = getBrowserCoords()
    .then((coords) => {
      cache = { kind: "ok", coords };
      inflight = null;
      return coords;
    })
    .catch((reason: GeoReason) => {
      cache = {
        kind: "unavailable",
        reason: reason ?? "unsupported",
        retryAfter:
          reason === "timeout" || reason === "unavailable"
            ? Date.now() + GEO_RETRY_MS
            : null,
      };
      inflight = null;
      throw cache.reason;
    });

  return inflight;
}

/** 不触发定位，只读当前已缓存的坐标（没有则 null）。供按附近过滤时快速判断。 */
export function cachedCoords(): Coords | null {
  return cache.kind === "ok" ? cache.coords : null;
}

/** 当前是否已确定定位不可用（用户拒权限 / 非安全环境等） */
export function isGeoUnavailable(): boolean {
  return cache.kind === "unavailable" && !failureExpired();
}

/** 清除已有结果以允许显式重试；进行中的定位仍共享，结束后正常写缓存。 */
export function resetGeo(): void {
  cache = { kind: "unknown" };
}
