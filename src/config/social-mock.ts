import { foods } from "@/config/foods";

/**
 * 好友干饭广播 · mock 数据层
 *
 * 隐私优先：好友一律匿名——只有 emoji 头像 + 代号（饭友#xx），不存任何真实姓名。
 * 这一层是「温和社交」的占位实现，结构刻意贴近未来云端形态：
 * 上线小程序后，把 getFriendFeed() 换成读 CloudBase 的同形状数据即可，UI 不用动。
 *
 * 灵感：朋友A看到朋友B摇出来的组合，突然也想吃B那一份 → 一键种草。
 */

/** 一条广播动态（对外展示用，已脱敏） */
export interface FriendActivity {
  id: string;
  /** 匿名头像 emoji */
  avatar: string;
  /** 匿名代号，如「饭友#A7」 */
  alias: string;
  /** 多少分钟前（相对时间，渲染时换算成「x分钟前」） */
  minutesAgo: number;
  /** 摇了几次才定下来 */
  shakeCount: number;
  /** 最终拍板要吃的食物 id（来自 foods 数据，保证可点可查店） */
  finalPickId: string;
  /** 一句温和的旁白 */
  note: string;
}

/** 安全按 id 取食物；取不到返回 null（防 mock 写错 id 时崩 UI） */
export function foodById(id: string) {
  return foods.find((f) => f.id === id) ?? null;
}

/**
 * mock 广播列表（按 minutesAgo 升序，越近越靠前）。
 * 用的都是 foods 里真实存在的 id，点「我也想吃」能直接种进抽取候选。
 */
const RAW: FriendActivity[] = [
  { id: "a1", avatar: "🍓", alias: "饭友#A7", minutesAgo: 12, shakeCount: 2, finalPickId: "japanese-beef-rice", note: "摇到了日式肥牛饭，决定就吃它啦～" },
  { id: "a2", avatar: "🍦", alias: "饭友#K3", minutesAgo: 58, shakeCount: 3, finalPickId: "coconut-latte", note: "纠结了 3 次，最终被生椰拿铁治愈了下午茶。" },
  { id: "a3", avatar: "🌶️", alias: "饭友#M9", minutesAgo: 95, shakeCount: 1, finalPickId: "sichuan-hotpot", note: "一把就摇中四川火锅，约人去了。" },
  { id: "a4", avatar: "🍜", alias: "饭友#R1", minutesAgo: 140, shakeCount: 4, finalPickId: "miso-ramen", note: "摇了好几轮，还是味噌拉面最对味。" },
  { id: "a5", avatar: "🧋", alias: "饭友#T5", minutesAgo: 175, shakeCount: 2, finalPickId: "cheese-tteokbokki", note: "韩式芝士年糕拉丝那下，直接决定了。" },
  { id: "a6", avatar: "🥗", alias: "饭友#B2", minutesAgo: 210, shakeCount: 2, finalPickId: "caesar-salad", note: "控卡中，凯撒沙拉刚刚好。" },
  { id: "a7", avatar: "🍕", alias: "饭友#L8", minutesAgo: 260, shakeCount: 3, finalPickId: "margherita-pizza", note: "和室友拼了个玛格丽特披萨。" },
  { id: "a8", avatar: "🍤", alias: "饭友#C4", minutesAgo: 320, shakeCount: 2, finalPickId: "pad-thai", note: "想吃点不一样的，泰式炒河粉中了。" },
];

/** 取广播列表（未来换成云端 fetch，同形状） */
export function getFriendFeed(): FriendActivity[] {
  return RAW;
}

/**
 * 把一条好友动态「翻译」成可种草的食物 id 列表。
 * 当前 mock 只记 finalPickId；上线后云端可存完整 combo，这里返回三样 id。
 */
export function comboOf(activity: FriendActivity): string[] {
  return [activity.finalPickId];
}
