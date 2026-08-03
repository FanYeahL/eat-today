/**
 * 食物相关的全局类型定义
 * 用于「今天吃什么」抽取玩法的数据建模
 */

/**
 * 口味地区
 * 用户可选自己的口味归属，抽取据此对主食加权（不硬筛，只调概率）。
 * "all" = 不限地区，全国随机。
 */
export type RegionKey =
  | "all"
  | "dongbei"
  | "chuanyu"
  | "hunan"
  | "guangdong"
  | "jiangzhe"
  | "xibei"
  | "yunguigui"
  | "beifang";

/**
 * 菜系身份（细粒度）
 * 共振算法的核心维度：决定一道菜「是什么风味」，三轴据此联动搭配。
 * 通过 cuisineMeta 映射到四大风味家族（chinese/western/jpkr/exotic）。
 * 中餐细分对应现有 RegionKey，便于「经典中式」下二级精修复用既有加权资产。
 */
export type CuisineKey =
  // 中式细分（与 RegionKey 对齐，cn-generic 为不分地区的通用中餐）
  | "cn-generic"
  | "cn-dongbei"
  | "cn-chuanyu"
  | "cn-hunan"
  | "cn-guangdong"
  | "cn-jiangzhe"
  | "cn-xibei"
  | "cn-yunguigui"
  | "cn-beifang"
  // 日韩
  | "japanese"
  | "korean"
  // 西餐
  | "western-italian"
  | "western-american"
  | "western-generic"
  // 异国（东南亚/中东/南亚等）
  | "thai"
  | "sea"
  | "mideast"
  | "indian"
  | "exotic-generic";

/**
 * 风味家族（四大类）
 * 漏斗顶层筛选用：经典中式 / 浪漫西餐 / 精致日韩 / 异国风味。
 * 不在 Food 上单独存，由 cuisine 经 cuisineMeta 推导，保证单一数据源。
 */
export type CuisineFamily = "chinese" | "western" | "jpkr" | "exotic";

/**
 * 食物在套餐里的角色
 * 抽取分层：轴1偏 main（撑场的正餐），轴2偏 snack（轻小吃/点心/凉菜），
 * 形成「正餐 + 轻小吃」的自然搭配。许多菜两者皆可，由抽取时按偏好加权。
 */
export type FoodRole = "main" | "snack";

/**
 * 价位档（漏斗「预算」筛选用）
 * budget=学生党平价 / normal=适中 / treat=小奢侈犒劳。
 */
export type PriceTier = "budget" | "normal" | "treat";

/**
 * 实体类型（如实记录每个条目「到底是什么」，不参与任何抽样/筛选逻辑）。
 * 审计发现 foods 池里混了四种不同粒度的实体，先把事实标下来，再谈结构。
 * - dish        具体菜品（黑椒牛排、鱼香肉丝盖饭）
 * - dish_group  菜品类别/泛指（披萨、汉堡、三明治、炸鸡）
 * - dining_style 用餐业态/形式（火锅、烧烤、烤肉、自助、串串）
 * - brand       品牌/连锁店（麦当劳、杨国福、全家便当——是「店」不是「菜」）
 * 注：饮品(kind==="drink")均为具体饮品，记为 dish。
 */
export type EntityType = "dish" | "dish_group" | "dining_style" | "brand";

/**
 * 辣度 0-3
 * 0=不辣 1=微辣 2=中辣 3=爆辣。
 * 漏斗「心情/辣度」筛选 + 轴3 解辣饮品共振都依赖它。
 */
export type SpicyLevel = 0 | 1 | 2 | 3;

/**
 * 食物分类标签
 * 使用字面量联合类型，保证添加食物数据时只能使用预定义标签，避免拼写错误。
 * 后续如需扩展标签，直接在此处补充即可，所有引用点会获得类型提示。
 */
export type FoodTag =
  | "高热量"
  | "清淡"
  | "适合宿舍"
  | "快手"
  | "下饭"
  | "健康轻食"
  | "暖胃"
  | "高蛋白"
  | "解馋"
  | "省钱"
  | "提神"
  | "续命"
  | "解腻";

/**
 * 推荐指数：1-5 的整数
 * 1 = 凑合，5 = 强烈安利
 */
export type RecommendLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 食物种类
 * 抽取分层：前两轴从 main 抽，第三轴从 drink 抽。
 */
export type FoodKind = "main" | "drink";

/**
 * 顶不顶饱 1..5。3 及以上视为「能当一顿饭」（决定 pickLayer）。
 */
export type SatietyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 犒劳感 / 丰盛度 1..5。treat 桶质量门要求 >=4。
 */
export type IndulgenceLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 主要获取方式（漏斗「场景」/ 后续可用性提示用）。
 */
export type Convenience =
  | "canteen"       // 食堂
  | "takeout"       // 外卖为主
  | "restaurant"    // 需堂食/餐厅
  | "convenience"   // 便利店即取
  | "dorm";         // 宿舍可自制

/**
 * 适合场景（可多个）。
 */
export type Occasion = "solo" | "date" | "friends" | "lateNight" | "quick";

/**
 * 决策层级——把「一顿饭级别的具体食物」与「小食/配菜/组合项」分开，
 * 让默认单菜抽签只出真正能当一餐的东西。
 * - "meal"：satiety>=3，一道能当一餐主角（进默认单菜池）。
 * - "side"：satiety<3，凉菜/小食/配菜/汤水/饮品，需搭配或组合（不进默认单菜池）。
 * 数据里显式写死（不靠运行时用 satiety 推导），保证 lint 与落库口径单一。
 */
export type PickLayer = "meal" | "side";

/**
 * 查店档案（对齐 spec §2）。Phase 1 仅作数据存在，运行时仍走 keywordOf。
 */
export interface SearchProfile {
  /** 「附近有没有这类店」——门控用（Phase 1 = shopKeyword ?? cuisineKeyword 结果） */
  gateQuery: string;
  /** 「展示店铺时搜什么」（= 菜名，保留具体菜品身份） */
  displayQuery: string;
  /** 兜底关键词（Phase 1 仅存，不启用） */
  fallbackQueries: string[];
}

/**
 * 餐段
 * 抽取据此按当前时间硬过滤，只摇当前餐段合适的食物。
 */
export type MealType =
  | "breakfast"
  | "lunch"
  | "tea"
  | "dinner"
  | "midnight";

/**
 * 抽取滚轮的最小渲染单元
 * Reel 只需要 emoji + 名字 + 唯一 key，与具体数据来源解耦——
 * Food 和菜谱索引条目都能满足它，从而复用同一个 Reel。
 */
export interface ReelItem {
  /** 唯一标识，React key 用 */
  id: string;
  /** 名称，滚轮小字展示 */
  name: string;
  /** emoji 图标，滚轮主视觉 */
  emoji: string;
}

/**
 * 单个食物条目
 * 继承 ReelItem（id/name/emoji），因此可直接喂给 Reel。
 */
export interface Food extends ReelItem {
  /** 种类：主食 or 饮品；决定它在抽取分层中归主食轴还是饮品轴 */
  kind: FoodKind;
  /** 分类标签，可多选；用于后续按场景筛选（如「只在适合宿舍的里抽」） */
  tags: FoodTag[];
  /** 推荐指数 1-5 */
  recommend: RecommendLevel;
  /** 一句话描述 / 安利语，可选 */
  description?: string;
  /**
   * 查附近店铺时用的搜索词，可选。
   * 当「商品名 ≠ 店铺名」时设它（如「全家轻食便当」要按店铺「全家」搜，
   * 而不是按商品名整串搜，否则高德按字面找不到店）。
   * 缺省则回退用【所属菜系的店铺类型词】（见 availability.ts keywordOf → cuisineKeyword），
   * 不是回退用 name——拿菜名硬搜店招里多半没有，会被误判「附近没有」永久踢出池。
   * 所以：通用菜（回锅肉/麻婆豆腐）留空走菜系兜底更稳；只有「菜名本身就是店招/品类」
   * （如黄焖鸡米饭、麻辣烫、麦当劳）才适合显式设成菜名。
   */
  shopKeyword?: string;
  /**
   * 地域归属，可选、可多个（如螺蛳粉算云贵桂）。
   * 用户选了某地区时，带该地区的菜出镜概率调高（招牌菜加权）。
   * 不标的菜靠地区的「口味权重」兜底，仍可能被摇到。
   * 注：仅对中式细分有意义；保留它以复用既有中餐二级加权逻辑。
   */
  regions?: RegionKey[];
  /**
   * 菜系身份（必填）。共振算法的核心维度，决定三轴如何联动搭配。
   * 经 cuisineMeta 映射到风味家族，供漏斗顶层筛选。
   */
  cuisine: CuisineKey;
  /**
   * 套餐角色：main（正餐主角）/ snack（轻小吃/点心）。
   * 轴1 偏 main、轴2 偏 snack，形成「正餐 + 轻小吃」搭配。
   * 仅对主食（kind==="main"）有意义；饮品不参与。
   */
  role: FoodRole;
  /** 价位档，漏斗「预算」筛选用 */
  priceTier: PriceTier;
  /**
   * 实体类型：这一条「到底是什么」（dish/dish_group/dining_style/brand）。
   * 纯如实记录，当前不参与任何抽样或筛选逻辑——先承认四种实体不同，再谈结构。
   */
  entityType: EntityType;
  /** 辣度 0-3，漏斗辣度筛选 + 轴3 解辣共振用 */
  spicy: SpicyLevel;
  /** 适合的餐段，可多个；抽取据此按当前餐段过滤 */
  meals: MealType[];

  // ——— Phase 1 新增（dish 必填；drink 见 §1.3：satiety=1 / pickLayer=side）———
  /** 顶不顶饱 1..5 */
  satiety: SatietyLevel;
  /** 犒劳感 / 丰盛度 1..5 */
  indulgence: IndulgenceLevel;
  /** 主要获取方式 */
  convenience: Convenience;
  /** 适合场景（可多个，非空） */
  occasion: Occasion[];
  /** 决策层级：meal=一顿饭级别(进默认单菜池) / side=小食配菜(不进) */
  pickLayer: PickLayer;
  /** 查店档案（§2，Phase 1 仅数据，不驱动运行时） */
  search: SearchProfile;
  /** 归一族：防相似菜连续刷屏（§5.4），可选；同组 cuisine 必须一致 */
  canonicalGroup?: string;
  /** 别名（查店/搜索扩展用，Phase 1 仅数据） */
  aliases?: string[];
  /** 关联菜谱 id（可选） */
  recipeIds?: string[];
}
