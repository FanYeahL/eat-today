/**
 * 今日菜单板 · 饭点氛围主题（scene）配置（单一可信源的 JS 侧）
 * ─────────────────────────────────────────────
 * 每个 meal 时段一套「气质」：颜色/光线由 CSS 的 .picker-theme [data-meal="x"] token 块驱动
 * （见 globals.css，色值单一可信源在那里，避免 TS/CSS 漂移）；本文件只存 JS 需要的两项：
 *   - ambient：PickerAtmosphere 该渲染哪一层背景氛围动效（每 meal 恰好一个）；
 *   - dark：该时段是否深色主题（dinner/midnight），仅用于断言/注释，不驱动色值。
 * tagline 语气已由 config/meals.ts 的 mealTaglines 覆盖，这里不重复造。
 *
 * 动效硬约束：每 meal 最多 1 个背景 ambient + 1 个食物焦点动效；只 transform/opacity；
 * reduced-motion 全关；很慢很轻不抢主内容。ambient 若显廉价 → 降级为静态光感，不补元素。
 */

import type { MealType } from "@/types/food";

/** 背景氛围动效类型（每 meal 一种，PickerAtmosphere 据此选层渲染）。 */
export type AmbientType = "steam" | "sun" | "sunset" | "city" | "midnight";

export interface MealScene {
  /** 该时段渲染哪一层 ambient（选层用，不写 if 链）。 */
  ambient: AmbientType;
  /** 深色主题时段（深底浅字，token 块里翻转 ink/surface）。 */
  dark: boolean;
}

/**
 * 五时段 scene。色值不在此（在 CSS token 块），此处只定 ambient 选层 + dark 断言。
 *  - breakfast 清晨暖黄 + 番茄橙 · 蒸汽（steam）
 *  - lunch     干净暖白 + 阳光黄 · 阳光斜带（sun）
 *  - tea       蜜桃杏橙 + 淡紫灰 · 夕阳光晕（sunset）
 *  - dinner    夜蓝深暖灰 + tomato · 城市光点 + 流星（city，深）
 *  - midnight  深蓝黑墨色 + 暖橙 · 角落黑猫（midnight，深）
 */
export const MEAL_SCENES: Record<MealType, MealScene> = {
  breakfast: { ambient: "steam", dark: false },
  lunch: { ambient: "sun", dark: false },
  tea: { ambient: "sunset", dark: false },
  dinner: { ambient: "city", dark: true },
  midnight: { ambient: "midnight", dark: true },
};

/** 取某 meal 的 scene。 */
export function mealScene(meal: MealType): MealScene {
  return MEAL_SCENES[meal];
}
