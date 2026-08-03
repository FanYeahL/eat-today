import type { RegionKey, FoodTag } from "@/types/food";

/**
 * 口味地区配置
 * - 选择器展示用的元信息（label/emoji）
 * - tasteWeights：该地区偏好的口味 tag → 权重。
 *   用于「没标 regions 的菜」的兜底加权：菜的 tag 命中越多，权重越高，
 *   让整盘风味也偏向所选地区，而不仅仅是点名的招牌菜。
 *
 * 加权只作用于主食两轴；饮品保持中立（地域性弱）。
 * 这是「调概率」不是「硬筛」——其它地区的菜照样能摇到，保留惊喜。
 */
export interface RegionMeta {
  key: RegionKey;
  /** 选择器展示名 */
  label: string;
  /** 展示 emoji */
  emoji: string;
  /** 该地区偏好的口味 tag 权重（兜底加权用） */
  tasteWeights: Partial<Record<FoodTag, number>>;
}

/** 顺序即选择器 UI 顺序；all 放第一个作默认 */
export const regionList: RegionMeta[] = [
  { key: "all", label: "都行", emoji: "🍽️", tasteWeights: {} },
  {
    key: "dongbei",
    label: "东北",
    emoji: "🥟",
    tasteWeights: { 高热量: 1.6, 下饭: 1.4, 暖胃: 1.3 },
  },
  {
    key: "chuanyu",
    label: "川渝",
    emoji: "🌶️",
    tasteWeights: { 高热量: 1.4, 解馋: 1.5, 下饭: 1.4 },
  },
  {
    key: "hunan",
    label: "湖南",
    emoji: "🔥",
    tasteWeights: { 下饭: 1.6, 解馋: 1.4 },
  },
  {
    key: "guangdong",
    label: "广东",
    emoji: "🦐",
    tasteWeights: { 清淡: 1.6, 暖胃: 1.3, 健康轻食: 1.3 },
  },
  {
    key: "jiangzhe",
    label: "江浙沪",
    emoji: "🥢",
    tasteWeights: { 清淡: 1.4, 解馋: 1.3 },
  },
  {
    key: "xibei",
    label: "西北",
    emoji: "🍜",
    tasteWeights: { 暖胃: 1.5, 高蛋白: 1.4, 高热量: 1.3 },
  },
  {
    key: "yunguigui",
    label: "云贵桂",
    emoji: "🌿",
    tasteWeights: { 暖胃: 1.4, 解馋: 1.4 },
  },
  {
    key: "beifang",
    label: "北方",
    emoji: "🍲",
    tasteWeights: { 下饭: 1.4, 暖胃: 1.4 },
  },
];

/** 按 key 取地区元信息 */
export function regionMeta(key: RegionKey): RegionMeta {
  return regionList.find((r) => r.key === key) ?? regionList[0];
}
