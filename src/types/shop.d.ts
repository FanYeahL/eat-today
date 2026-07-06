/**
 * 店铺类型
 * 由服务端 /api/shops 归一化高德 POI 数据后返回，前端只消费这个结构。
 */
export interface Shop {
  /** 高德 POI id，作为 React key */
  id: string;
  /** 店名 */
  name: string;
  /** 地址 */
  address: string;
  /** 距用户的距离（米）；未定位 / 关键字搜索时可能为 null */
  distance: number | null;
  /** 评分（0-5）；高德未必每家都有，缺失为 null */
  rating: number | null;
  /** 电话；可能缺失 */
  tel: string | null;
  /** "lng,lat" 经纬度字符串，用于拼跳转高德地图的链接 */
  location: string;
  /**
   * 店类型标签（从高德 type 中段提炼，如「快餐厅」「咖啡厅」「糕饼店」）。
   * 主要给第二层「扩展推荐」展示——告诉用户这家店是哪类、为什么可能也卖。
   * 严格匹配店不依赖它，缺失为 null。
   */
  category: string | null;
}

/** /api/shops 的返回结构 */
export interface ShopsResponse {
  /** 第一层：严格匹配（店名/类型含菜名关键词）的店 */
  shops: Shop[];
  /** 本次结果的定位来源说明，便于前端提示 */
  via: "location" | "city";
  /**
   * 第二层·扩展推荐：同一次高德搜索里、严格匹配筛掉的同类店
   * （如搜「三明治」筛出赛百味/巴黎贝甜——店名不含「三明治」但常供应）。
   * 始终返回（不再只在严格为空时兜底），由前端按阈值决定展不展示：
   * 严格匹配 < STRICT_ENOUGH 家时，在严格结果下方追加「这些店通常也有」。
   * 已剔除与 shops 重复的店；带 category 标签便于按店类型呈现。
   */
  expansion?: Shop[];
}

