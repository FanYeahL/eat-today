/**
 * /api/shops 的输入解析 / 校验 + 带超时的 fetch —— 抽成纯逻辑，便于单测。
 * ─────────────────────────────────────────────
 * route.ts 只负责「调高德 + 归一化 POI」，把「用户传进来的 query 合不合法」和
 * 「外部请求怎么不被拖死」这两件与网络无关、可确定性测试的事放这里。
 *
 * 校验纪律：宁可 400 早拒，也不把脏输入透传给高德（省额度、防滥用、可预期报错）。
 */

/** 关键字最大长度：够放最长的菜名 / 店型词，超了基本是滥用或误传 */
export const MAX_KEYWORD_LEN = 40;
/** 城市名最大长度 */
export const MAX_CITY_LEN = 20;
/** 单次高德请求超时（毫秒）。免费 key 偶发很慢，超时直接失败好过挂住整条请求。 */
export const AMAP_TIMEOUT_MS = 8000;

/** 解析成功后的规范化 query */
export interface ShopQuery {
  /** 已 trim、非空、长度合法的关键字 */
  keyword: string;
  /** 城市名（关键字搜索用）；未传为 null */
  city: string | null;
  /** 经度字符串（原样，供拼 location）；未走周边搜索为 null */
  lng: string | null;
  /** 纬度字符串；未走周边搜索为 null */
  lat: string | null;
  /** 是否走周边搜索（经纬度齐全且合法） */
  useAround: boolean;
  /** count 模式：只回「附近有几家」 */
  countOnly: boolean;
}

/** 解析失败：带上要回给前端的错误信息与 HTTP 状态码 */
export interface ShopQueryError {
  error: string;
  status: number;
}

/** 判别联合类型：是不是解析错误 */
export function isQueryError(
  x: ShopQuery | ShopQueryError,
): x is ShopQueryError {
  return (x as ShopQueryError).error !== undefined;
}

/**
 * 解析 + 校验 query 参数。纯函数：只读 URLSearchParams，不碰网络 / 环境。
 * 规则：
 * - keyword 必填、trim 后非空、长度 ≤ MAX_KEYWORD_LEN。
 * - city 可选，长度 ≤ MAX_CITY_LEN。
 * - lng/lat 要么都不传（走城市搜索），要么成对且合法：
 *   经度 -180..180、纬度 -90..90，必须是有限数。只传一个 → 400。
 */
export function parseShopQuery(
  params: URLSearchParams,
): ShopQuery | ShopQueryError {
  const keyword = (params.get("keyword") ?? "").trim();
  if (!keyword) {
    return { error: "缺少 keyword 参数。", status: 400 };
  }
  if (keyword.length > MAX_KEYWORD_LEN) {
    return { error: `关键字过长（最多 ${MAX_KEYWORD_LEN} 字）。`, status: 400 };
  }

  const cityRaw = (params.get("city") ?? "").trim();
  if (cityRaw.length > MAX_CITY_LEN) {
    return { error: `城市名过长（最多 ${MAX_CITY_LEN} 字）。`, status: 400 };
  }
  const city = cityRaw || null;

  // 空串（?lng=&lat=）视作未传，避免误判成「只传了一个」
  const lngStr = (params.get("lng") ?? "").trim();
  const latStr = (params.get("lat") ?? "").trim();
  const hasLng = lngStr !== "";
  const hasLat = latStr !== "";
  if (hasLng !== hasLat) {
    return { error: "经纬度必须成对提供（lng 与 lat）。", status: 400 };
  }

  let lng: string | null = null;
  let lat: string | null = null;
  if (hasLng && hasLat) {
    const lngNum = Number(lngStr);
    const latNum = Number(latStr);
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      return { error: "经度非法（需为 -180..180 之间的数字）。", status: 400 };
    }
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      return { error: "纬度非法（需为 -90..90 之间的数字）。", status: 400 };
    }
    lng = lngStr;
    lat = latStr;
  }

  const useAround = lng !== null && lat !== null;
  const countOnly = params.get("count") === "1";

  return { keyword, city, lng, lat, useAround, countOnly };
}

/**
 * 带超时的 fetch：到点用 AbortController 掐断，避免外部接口把请求挂死。
 * fetchImpl 可注入，便于单测不打真实网络。无论成功失败都清掉定时器。
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = AMAP_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
