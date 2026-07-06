import type {
  CuisineKey,
  CuisineFamily,
  FoodTag,
  RegionKey,
} from "@/types/food";

/**
 * 菜系 / 风味共振配置
 *
 * 这是「懂你的干饭组合算法」的知识库：
 * - cuisineMeta：每个细粒度菜系 → 风味家族 + 展示信息 +（中餐）对应地区。
 * - familyList：漏斗顶层四大风味家族的选择器元信息。
 * - cuisineAffinity：菜系相容度，供轴2「最佳拍档」降级链用
 *   （同系最亲 → 相容次之 → 跨系最弱，但都不为 0，保留惊喜）。
 * - pairingRules：口味互补规则，供轴3「惊艳配角」（饮品/甜点）共振用
 *   （吃辣 → 解辣解腻饮品加权；油腻 → 清爽加权）。
 *
 * 设计原则：只「调概率 + 降级兜底」，绝不硬锁导致空池。
 */

export interface CuisineMeta {
  key: CuisineKey;
  /** 所属四大风味家族 */
  family: CuisineFamily;
  /** 展示名 */
  label: string;
  /** 展示 emoji */
  emoji: string;
  /** 中式细分对应的地区 key（用于「经典中式」二级筛选复用既有加权）；非中式为 undefined */
  regionKey?: RegionKey;
}

/** 全部细粒度菜系的元信息 */
export const cuisineMeta: Record<CuisineKey, CuisineMeta> = {
  "cn-generic": { key: "cn-generic", family: "chinese", label: "中餐", emoji: "🥢" },
  "cn-dongbei": { key: "cn-dongbei", family: "chinese", label: "东北菜", emoji: "🥟", regionKey: "dongbei" },
  "cn-chuanyu": { key: "cn-chuanyu", family: "chinese", label: "川渝菜", emoji: "🌶️", regionKey: "chuanyu" },
  "cn-hunan": { key: "cn-hunan", family: "chinese", label: "湘菜", emoji: "🔥", regionKey: "hunan" },
  "cn-guangdong": { key: "cn-guangdong", family: "chinese", label: "粤菜", emoji: "🦐", regionKey: "guangdong" },
  "cn-jiangzhe": { key: "cn-jiangzhe", family: "chinese", label: "江浙菜", emoji: "🥢", regionKey: "jiangzhe" },
  "cn-xibei": { key: "cn-xibei", family: "chinese", label: "西北菜", emoji: "🍜", regionKey: "xibei" },
  "cn-yunguigui": { key: "cn-yunguigui", family: "chinese", label: "云贵桂菜", emoji: "🌿", regionKey: "yunguigui" },
  "cn-beifang": { key: "cn-beifang", family: "chinese", label: "北方菜", emoji: "🍲", regionKey: "beifang" },
  japanese: { key: "japanese", family: "jpkr", label: "日式", emoji: "🍱" },
  korean: { key: "korean", family: "jpkr", label: "韩式", emoji: "🍲" },
  "western-italian": { key: "western-italian", family: "western", label: "意式", emoji: "🍝" },
  "western-american": { key: "western-american", family: "western", label: "美式", emoji: "🍔" },
  "western-generic": { key: "western-generic", family: "western", label: "西餐", emoji: "🍽️" },
  thai: { key: "thai", family: "exotic", label: "泰式", emoji: "🍤" },
  sea: { key: "sea", family: "exotic", label: "东南亚", emoji: "🍛" },
  mideast: { key: "mideast", family: "exotic", label: "中东", emoji: "🥙" },
  "exotic-generic": { key: "exotic-generic", family: "exotic", label: "异国", emoji: "🌍" },
};

/** 取某菜系的家族（带兜底） */
export function familyOf(cuisine: CuisineKey): CuisineFamily {
  return cuisineMeta[cuisine]?.family ?? "chinese";
}

/**
 * 菜系 → 高德 POI 检索的「店铺类型钥匙词」。
 *
 * ⚠️ 这是【后台门控/查店】专用的暗钥，**永不上屏**：
 * 用户在签纸上看到的永远是品类池里随机抽出的真实菜名（川渝 → 回锅肉/辣子鸡/麻婆豆腐），
 * 这里只是拿来问高德「附近有没有这一类的【店】」。
 *
 * 选词原则：用【店铺类型词】，不用代表菜。
 * availability 判断的是「餐厅存在性」而非「某道代表菜存在性」——
 * 搜「川菜」直接命中高德 POI 的 type 字段（餐饮服务;中餐厅;川菜），稳定且语义正确；
 * 而搜代表菜（水煮鱼）得赌店招恰好带这三个字，要靠门控放宽兜底，不稳。
 * 词取高德 POI 分类体系里的标准店类型，命中最稳。
 */
const CUISINE_KEYWORD: Record<CuisineKey, string> = {
  "cn-generic": "家常菜",
  "cn-dongbei": "东北菜",
  "cn-chuanyu": "川菜",
  "cn-hunan": "湘菜",
  "cn-guangdong": "粤菜",
  "cn-jiangzhe": "江浙菜",
  "cn-xibei": "西北菜",
  "cn-yunguigui": "云南菜",
  "cn-beifang": "北方菜",
  japanese: "日本料理",
  korean: "韩国料理",
  "western-italian": "意大利菜",
  "western-american": "美式餐厅",
  "western-generic": "西餐厅",
  thai: "泰国菜",
  sea: "东南亚菜",
  mideast: "中东菜",
  "exotic-generic": "异国料理",
};

/**
 * 取某菜系的高德检索店铺类型词（带兜底）。
 * 一道没设 shopKeyword 的菜，查店时回落到它所属菜系的店类型词——
 * 而不是拿菜名硬搜（回锅肉→川菜，问的是「附近有没有川菜馆」）。
 */
export function cuisineKeyword(cuisine: CuisineKey): string {
  return CUISINE_KEYWORD[cuisine] ?? "家常菜";
}

export interface FamilyMeta {
  key: CuisineFamily;
  label: string;
  emoji: string;
}

/** 漏斗顶层「风味四大类」选择器，顺序即 UI 顺序 */
export const familyList: FamilyMeta[] = [
  { key: "chinese", label: "经典中式", emoji: "🥢" },
  { key: "western", label: "浪漫西餐", emoji: "🍝" },
  { key: "jpkr", label: "精致日韩", emoji: "🍱" },
  { key: "exotic", label: "异国风味", emoji: "🌍" },
];

/**
 * 菜系相容度（轴2 最佳拍档用）。
 * 返回 0~1 的亲和系数：
 *   同一菜系 = 1（最亲，日拉面配日烧鸟）
 *   同一家族不同菜系 = 0.6（川菜配湘菜）
 *   跨家族但「中性」可搭 = 0.25（中餐配可乐这种通用）
 *   完全不搭 = 0.1（不归零，极小概率仍可出，保留惊喜）
 * 这是「软相容」，配合权重相乘，不做硬筛。
 */
export function cuisineAffinity(a: CuisineKey, b: CuisineKey): number {
  if (a === b) return 1;
  const fa = familyOf(a);
  const fb = familyOf(b);
  if (fa === fb) return 0.6;
  return 0.25;
}

/**
 * 口味互补规则（轴3 惊艳配角 / 饮品共振用）。
 * 给定前两轴主食的「最高辣度」与「是否油腻」，
 * 返回一个函数：对候选饮品按其 tag 命中情况打加权系数。
 *
 * 规则朴素而自然：
 * - 主食够辣（spicy>=2）→ 带「解辣/解腻/清淡」的饮品大幅加权（杨枝甘露、柠檬茶、酸梅汤）
 * - 主食油腻（高热量且非健康轻食）→ 带「解腻/清淡」的饮品加权
 * - 否则中性，不偏。
 */
export function drinkPairingWeight(
  drinkTags: FoodTag[],
  ctx: { maxSpicy: number; greasy: boolean },
): number {
  let w = 1;
  const has = (t: FoodTag) => drinkTags.includes(t);
  if (ctx.maxSpicy >= 2) {
    if (has("解腻")) w *= 2.2;
    if (has("解馋")) w *= 1.3;
    if (has("清淡")) w *= 1.6;
  }
  if (ctx.greasy) {
    if (has("解腻")) w *= 1.8;
    if (has("清淡")) w *= 1.4;
  }
  return w;
}
