/**
 * 今日菜单板 / Universal Menu Picker · 文案（单一可信源）
 * ─────────────────────────────────────────────
 * 核心隐喻：不是「抽中一道菜」，而是「给你生成一份适合现在的今日推荐菜单」。
 * 语气取向：抓眼球但可信、有食欲但不广告、有快乐感但不幼稚、全年龄可懂。
 *
 * 刻意避开两类词：
 *  ① 玄学/水占：投签、签、吉位、大吉、缘分、循此而去。
 *  ② 抽奖/老虎机：抽中、开奖、命中、中奖、惊喜爆出。
 * 改用「菜单生成器」的产品话：帮我选一个 / 今天推荐 / 就吃这个 /
 * 加到今天这桌 / 找附近的店 / 再换一道。
 */

/** 品牌 / hero 区。 */
export const HERO = {
  brand: "Universal Menu Picker",
  board: "今日菜单板",
  title: "今天吃什么",
  /** 主标题下的一句定位（产品感，非标语轰炸）。 */
  lede: "告诉我口味，帮你生成一份现在就想吃的推荐。",
} as const;

/** 主行动按钮：生成一份今日推荐（非「抽一下」）。 */
export const PICK_CTA = "帮我选一个";
/** 已有推荐后再生成一道。 */
export const PICK_MORE_CTA = "再换一道";

/**
 * picking 屏文案：饭点雷达在按条件匹配（非「开奖中」）。
 * 随机取一条，客户端取避免 SSR 水合不一致。
 */
export const PICKING_LINES: string[] = [
  "正在按你的口味匹配…",
  "在合适的菜里挑一道…",
  "看看这会儿适合吃什么…",
  "为你搭配今日推荐…",
];

/**
 * result 页「今天推荐」下的一句推荐语（随机取一条）。
 * 中性、可信、有食欲——像一份菜单给出的推荐理由，不是中奖恭喜。
 */
export const RESULT_LINES: string[] = [
  "就它了，别再纠结啦。",
  "这会儿吃它正合适。",
  "顺着这一口，今天会舒服点。",
  "看着就有食欲，值得一试。",
  "想吃就去吃，不会后悔的选择。",
  "简单一餐，也能把日子过得有滋味。",
  "近处就有好味道，不用跑远。",
  "犒劳一下最近辛苦的自己。",
];

/** 从字符串池随机取一条（客户端调用，避免 SSR 水合不一致）。 */
export function randomLine(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** result 页动作按钮文案（层级：主=就吃这个·找店）。 */
export const RESULT_ACTIONS = {
  again: "再换一道",
  add: "加到今天这桌",
  /** n=今天这桌的菜数（含当前这道）；用于主按钮。 */
  confirm: (n: number) => (n > 1 ? `就吃这些 · 找店` : "就吃这个 · 找店"),
} as const;

/** result 顶部小标（当前是第几条推荐 / 今天这桌计数标签）。 */
export const RESULT_LABELS = {
  todayPick: "今天推荐",
  reason: "为什么推荐它",
  tableTitle: "今天这桌",
} as const;

/** 一个口味/餐段整池翻遍时的提示（对应 CastResult.exhausted）。 */
export const EXHAUSTED_HINT = "这个口味的都推荐过啦，换个条件再试试。";

/** 结果卡的轻标签文案（推荐度 / 辣度），纯展示，不影响生成。 */
export function recommendLabel(recommend: number): string {
  if (recommend >= 5) return "很推荐";
  if (recommend >= 4) return "推荐";
  return "值得一试";
}

/** 辣度 0-3 → 展示文本；0 不辣时返回 null（不显示标签）。 */
export function spicyLabel(spicy: number): string | null {
  switch (spicy) {
    case 1:
      return "微辣";
    case 2:
      return "中辣";
    case 3:
      return "重辣";
    default:
      return null;
  }
}

/** 顶饱度 3-5 → 展示；<3 不显示（side 一般不进主池）。 */
export function satietyLabel(satiety: number): string | null {
  if (satiety >= 4) return "顶饱";
  if (satiety >= 3) return "能当一餐";
  return null;
}

/** 次要入口（去玄学 + 去抽奖）。 */
export const SIDE_ENTRIES = {
  cook: { emoji: "🍳", label: "自己做" },
  diary: { emoji: "📖", label: "吃饭记录" },
} as const;

/** 各面板标题与副标题。 */
export const PANEL_COPY = {
  cook: {
    title: "自己做",
    subtitle: "今天想下厨？翻一道想做的菜，照着做就行。",
    randomFirst: "随手翻一道",
    randomMore: "再翻一道",
    back: "← 返回",
  },
  diary: {
    title: "吃饭记录",
    back: "← 返回",
  },
} as const;

/** 探店屏标题（按严格/扩展两级动态；现代找店口吻，非水占）。 */
export function shopsHeading(strictCount: number, hasExpansion: boolean): string {
  if (strictCount === 0) return "附近没有主打这道的店，这些通常也有";
  if (hasExpansion) return `附近 ${strictCount} 家主打这道，往下是通常也有的`;
  return `附近 ${strictCount} 家能吃到`;
}

/** 探店屏顶部一句（这份菜单附近哪里能吃到）。 */
export const SHOPS_LEDE = "这份推荐，附近哪里能吃到";
