import type { MealType } from "@/types/food";

/**
 * 餐段元信息与时间判定
 * 时间划分：
 *   🌅 早饭 5:00–11:00
 *   ☀️ 午饭 11:00–14:00
 *   🍰 下午茶 14:00–17:00
 *   🌆 晚饭 17:00–23:00
 *   🌙 宵夜 23:00–次日 5:00
 */

export interface MealMeta {
  type: MealType;
  /** 展示用 emoji */
  emoji: string;
  /** 展示名 */
  label: string;
  /** 时间段描述 */
  range: string;
}

/** 餐段的展示元信息，顺序即 UI 顺序 */
export const meals: MealMeta[] = [
  { type: "breakfast", emoji: "🌅", label: "早饭", range: "5:00–11:00" },
  { type: "lunch", emoji: "☀️", label: "午饭", range: "11:00–14:00" },
  { type: "tea", emoji: "🍰", label: "下午茶", range: "14:00–17:00" },
  { type: "dinner", emoji: "🌆", label: "晚饭", range: "17:00–23:00" },
  { type: "midnight", emoji: "🌙", label: "宵夜", range: "23:00–5:00" },
];

/** 按餐段类型取元信息 */
export function mealMeta(type: MealType): MealMeta {
  return meals.find((m) => m.type === type) ?? meals[1];
}

/**
 * 各餐段的副标题候选，像朋友一样随口关心你，自然亲切。
 * 调用方在客户端按当前餐段随机取一条（放在 effect 里，避免 SSR 水合不一致）。
 */
export const mealTaglines: Record<MealType, string[]> = {
  breakfast: [
    "起来啦，先吃点东西垫垫。",
    "新的一天，吃顿早餐再出门吧。",
    "别饿着肚子赶路，吃点再走。",
    "早上随便吃点，也是好的开始。",
  ],
  lunch: [
    "忙一上午了，歇会儿吃饭吧。",
    "中午到了，咱好好吃一顿。",
    "不知道吃啥？让它帮你挑一个。",
    "吃饱点，下午才有劲儿。",
  ],
  tea: [
    "下午有点饿了吧，来点小食。",
    "忙了半天，喝杯热的歇歇。",
    "犒劳一下自己，吃点甜的。",
    "午后这会儿，最适合放空一下。",
  ],
  dinner: [
    "忙一天了，晚上吃点好的。",
    "回到家，给自己做顿饭也不错。",
    "晚上想吃啥？慢慢挑。",
    "一天结束了，好好吃顿饭吧。",
  ],
  midnight: [
    "这会儿嘴馋了？吃一点没关系。",
    "饿了就吃点，别硬扛着。",
    "深夜来碗热乎的，挺治愈的。",
    "吃完早点睡，明天又是一天。",
  ],
};

/**
 * 根据时间判定当前餐段。
 * @param date 传入便于测试；默认调用方在客户端传 new Date()
 */
export function getCurrentMeal(date: Date): MealType {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "tea";
  if (h >= 17 && h < 23) return "dinner";
  return "midnight";
}
