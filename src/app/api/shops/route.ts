import { NextResponse } from "next/server";
import type { Shop, ShopsResponse } from "@/types/shop";
import {
  parseShopQuery,
  isQueryError,
  fetchWithTimeout,
} from "@/lib/shop-query";

/**
 * 店铺搜索代理
 * 浏览器把「关键字 + 经纬度（或城市）」发到这里，由服务端带 key 去调高德 REST，
 * key 只存在服务端环境变量，绝不下发到浏览器。
 *
 * 用法：
 *   /api/shops?keyword=黄焖鸡米饭&lng=114.4&lat=30.5   → 周边搜索（按距离）
 *   /api/shops?keyword=黄焖鸡米饭&city=武汉            → 关键字搜索（无定位兜底）
 *   /api/shops?keyword=黄焖鸡米饭&lng=..&lat=..&count=1 → 只回 {count}，给「按附近过滤」用
 */

const AMAP_AROUND = "https://restapi.amap.com/v3/place/around";
const AMAP_TEXT = "https://restapi.amap.com/v3/place/text";
const PAGE_SIZE = 15; // 最多列出多少家（多但不刷屏）
// 周边搜索半径（米）。设得很大只是兜底防「几十公里外的离谱结果」，
// 不用来卡「就近」——就近靠 sortrule=distance 排序 + PAGE_SIZE 取最近一批实现。
// 这样即使 3 公里内没有，也会把更远处最近的那几家列出来，不会误报「附近没有」。
const AROUND_RADIUS = 50000;

/** 退避等待 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 全局限流（根治 CUQPS 的关键）。
 * 高德的并发 QPS 限制是按【整个 key】算的，不是按单个用户——一个人连抽、
 * 或多设备同时用，请求叠加就会冲破免费 key 那个很低的并发上限。
 * 这里把本进程内所有高德请求串成一条链、相邻两次强制间隔 MIN_GAP_MS 通过，
 * 从源头保证我们打出去的速率不超限（约 2.8 QPS < 免费 key 的 3 QPS）。
 * CloudRun 是常驻 Node 进程，这个模块级闸门对同实例的全部请求都生效。
 * 注：多实例时各自有一道闸（极端放量才需共享限流/升级 key 配额），重试+抖动兜底。
 */
const MIN_GAP_MS = 350;
let gateChain: Promise<void> = Promise.resolve();
let lastCallAt = 0;

/** 排进限流闸：返回一个 resolve 时机已满足「距上次≥MIN_GAP_MS」的 Promise */
function passThrottle(): Promise<void> {
  const wait = gateChain.then(async () => {
    const now = Date.now();
    const gap = now - lastCallAt;
    if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap);
    lastCallAt = Date.now();
  });
  // 链上只串排队逻辑本身，不串后续 fetch，避免一个慢请求拖垮整条队
  gateChain = wait.catch(() => {});
  return wait;
}

/**
 * 拉高德数据，对「并发 QPS 超限」(CUQPS_HAS_EXCEEDED_THE_LIMIT) 自动退避重试。
 * 先过全局限流闸（主防线），再发请求；万一仍撞上（多实例/外部抖动）退避重试兜底。
 * 退避带随机抖动 ×(0.5~1.5) 打散惊群。日额度/参数类错误不重试，原样返回。
 * 返回高德的 JSON（data）；网络异常则抛，由上层 catch。
 */
async function fetchAmap(
  endpoint: string,
  qs: string,
): Promise<Record<string, unknown>> {
  const bases = [0, 200, 450, 800]; // 首发 + 三次重试基数(ms)
  let data: Record<string, unknown> = {};
  for (let i = 0; i < bases.length; i++) {
    if (bases[i] > 0) {
      const jitter = 0.5 + Math.random(); // 0.5~1.5，打散惊群
      await sleep(Math.round(bases[i] * jitter));
    }
    await passThrottle(); // 过全局限流闸再打高德
    const res = await fetchWithTimeout(`${endpoint}?${qs}`, {
      // 高德数据有时效性，但同条件短时间内可缓存，降低额度消耗
      next: { revalidate: 60 },
    });
    data = (await res.json()) as Record<string, unknown>;
    if (data.status === "1") return data;
    // 只对 QPS 超限重试；其它错误（额度、参数）立即返回交上层处理
    const info = str(data.info) ?? "";
    if (!info.includes("CUQPS")) return data;
  }
  return data; // 重试到底仍超限，返回最后一次（上层据 status 报错）
}

/**
 * 高德字段缺失时返回空数组 []，存在时返回字符串。
 * 统一成 string | null。
 */
function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

/** 把高德一条 POI 归一化成我们的 Shop */
function toShop(poi: Record<string, unknown>): Shop {
  const bizExt = (poi.biz_ext ?? {}) as Record<string, unknown>;
  const ratingRaw = str(bizExt.rating);
  const distanceRaw = str(poi.distance);

  return {
    id: String(poi.id ?? poi.name ?? Math.random()),
    name: str(poi.name) ?? "未知店铺",
    address: str(poi.address) ?? "地址信息缺失",
    distance: distanceRaw !== null ? Number(distanceRaw) : null,
    rating: ratingRaw !== null ? Number(ratingRaw) : null,
    tel: str(poi.tel),
    location: str(poi.location) ?? "",
    category: categoryOf(poi),
  };
}

/**
 * 从高德 type 提炼「店类型」短标签，给第二层扩展推荐展示。
 * 高德 type 是「大类;中类;小类」三级（如「餐饮服务;快餐厅;快餐厅」），
 * 取中段最具体且对用户有意义——「快餐厅 / 咖啡厅 / 糕饼店 / 甜品店」。
 * 中段是泛词（餐饮相关场所/餐饮相关）时退到小段，仍泛就返回 null（不硬贴标签）。
 */
const VAGUE_CATEGORY = new Set([
  "餐饮相关场所",
  "餐饮相关",
  "餐饮服务",
  "",
]);
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

/**
 * 相关性过滤：高德是模糊匹配，搜「牛肉粉」会把所有带「粉/面」的店都丢回来
 * （螺蛳粉、桂林米粉、小面…）。只数 count 会被噪音撑高，导致「附近有」假阳性，
 * 列表也被噪音盖住真·目标店。
 *
 * 判定：关键词出现在 name / keytag / type 任一即算相关。三字段缺一不可——
 * - 菜名词（牛肉粉/火锅）多命中 name 或 type（如 type=…火锅店）；
 * - 店铺类型词（便利店）店名未必带，但 keytag=便利店 / type=…便利店 能兜住
 *   （7-ELEVEn、罗森 这种）；
 * - 呷哺呷哺 这类只有 keytag=小火锅 命中「火锅」。
 * 门控 count 与展示列表共用它，保证「说有就真有、列出的也是对的」。
 */
function isRelevant(poi: Record<string, unknown>, keyword: string): boolean {
  const fields = [str(poi.name), str(poi.keytag), str(poi.type)];
  return fields.some((f) => f !== null && f.includes(keyword));
}

/**
 * 门控专用·放宽相关性（仅 count 模式用，不影响展示列表）。
 *
 * 背景：门控关键词用的是「店铺类型词」（川菜/意大利餐厅/日本料理…），高德按距离返回的
 * 同类餐厅，type 字段多半已含该词（餐饮服务;中餐厅;川菜）→ 严格 isRelevant 直接命中。
 * 但少数措辞会错位：搜「意大利餐厅」高德可能给 type=「餐饮服务;西餐厅;意大利菜」，
 * 字面不含「意大利餐厅」→ 严格匹配漏判→ 误报「附近没有」→ 又把菜踢出池（正是要根治的）。
 *
 * 安全网：count 模式下，严格命中 OR「是餐饮类 POI」即算相关。
 * 为何不会过度放宽：高德的关键词搜索本身是语义过滤的——搜「便利店」只会返回便利店
 * （type=购物服务;便利店，不含「餐饮服务」，不会被这条误纳），不会把川菜馆算进便利店可用性；
 * 搜「川菜」返回的就是川菜馆。所以这条只在「高德认为匹配、但 type 措辞与我们的词不同字面」
 * 时兜底，方向只会减少假阴性（门控本就该问「附近有没有这类店」，高德已替我们判过了）。
 */
function isGateRelevant(poi: Record<string, unknown>, keyword: string): boolean {
  if (isRelevant(poi, keyword)) return true;
  const type = str(poi.type);
  return type !== null && type.includes("餐饮");
}


export async function GET(request: Request) {
  const key = process.env.AMAP_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "服务端未配置 AMAP_KEY，请在 .env.local 中设置。" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  // 解析 + 校验交给纯函数（长度上限、经纬度合法性与成对性），脏输入早拒不透传高德。
  // count 模式：只关心「附近有没有相关的店」，回 {count}。给「抽取之前按附近过滤」用。
  // 注意：不能再用高德裸 count——那是模糊匹配的总数，含大量噪音（搜牛肉粉混进螺蛳粉），
  // 必须取整页 + 相关性过滤后再数，才与展示一致、不假阳性。
  const parsed = parseShopQuery(searchParams);
  if (isQueryError(parsed)) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { keyword, city, lng, lat, useAround, countOnly } = parsed;

  // 有经纬度走周边搜索（按距离排序），否则走城市关键字搜索
  const via: ShopsResponse["via"] = useAround ? "location" : "city";

  // 两种模式都取整页 + extensions=all：相关性过滤要读 keytag/type，
  // count 模式也得过滤后再数，所以不能再走「offset=1 + base」的省额度老路。
  const params = new URLSearchParams({
    key,
    keywords: keyword,
    offset: String(PAGE_SIZE),
    page: "1",
    extensions: "all",
  });

  let endpoint: string;
  if (useAround) {
    endpoint = AMAP_AROUND;
    params.set("location", `${lng},${lat}`);
    params.set("radius", String(AROUND_RADIUS));
    params.set("sortrule", "distance");
  } else {
    endpoint = AMAP_TEXT;
    if (city) params.set("city", city);
    params.set("citylimit", "true");
  }

  try {
    const data = await fetchAmap(endpoint, params.toString());

    if (data.status !== "1") {
      return NextResponse.json(
        { error: `高德接口返回错误：${str(data.info) ?? "未知"}` },
        { status: 502 },
      );
    }

    const pois = Array.isArray(data.pois)
      ? (data.pois as Record<string, unknown>[])
      : [];

    // count 模式（门控）：用放宽相关性，回「附近有几家这类店」。
    // 过滤后为 0 = 附近确实没这类店，门控据此把菜排除出候选池，从根上避免「抽到没地方吃」。
    // 用 isGateRelevant 而非严格 isRelevant：店类型词措辞与高德 type 字面错位时也能兜住，
    // 只减少假阴性、不会过度放宽（高德关键词搜索本身已语义过滤，详见 isGateRelevant 注释）。
    if (countOnly) {
      const count = pois.filter((poi) => isGateRelevant(poi, keyword)).length;
      return NextResponse.json({ count });
    }

    // 展示列表第一层：严格相关性过滤，踢掉高德模糊匹配带进来的噪音店。
    const relevant = pois.filter((poi) => isRelevant(poi, keyword));
    const shops = relevant.map(toShop);

    // 第二层·扩展推荐：同一次搜索里、严格匹配筛掉的同类店（赛百味/巴黎贝甜这种
    // 店名不含菜名、但高德认为相关、常供应这道的店）。始终算出来一并返回，
    // 由前端按阈值决定展不展示——这就把「严格匹配只有 1~2 家、选择太少」这个
    // 第三态接住了，不再二元地只在 0 家时兜底。
    // 用 id 去重，避免与严格层重复；不调第二次高德、不维护菜系表，零额外成本。
    const strictIds = new Set(shops.map((s) => s.id));
    const expansion = pois
      .filter((poi) => !isRelevant(poi, keyword)) // 严格层之外的
      .map(toShop)
      .filter((s) => !strictIds.has(s.id))
      .slice(0, PAGE_SIZE);

    const payload: ShopsResponse = {
      shops,
      via,
      ...(expansion.length > 0 ? { expansion } : {}),
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "请求高德接口失败，请稍后重试。" },
      { status: 502 },
    );
  }
}
