/**
 * 今日菜单板 · 饭点「场景舞台」配置（JS 侧单一可信源）
 * ─────────────────────────────────────────────
 * 每个 meal 时段是一整幕全屏场景（天空 + 光源 + 粒子 + 地平线剪影），内容浮在场景上。
 * 颜色/光线由 CSS 的 .picker-theme [data-meal="x"] token 块驱动（色值单一可信源在 globals.css：
 * --sky-0/-1/-2 天空三段、--glow 光源、--sil 剪影，外加原有 --c-* 面板色）。本文件只存 JS 需要的：
 *   - scene：PickerScene 该渲染哪一幕场景（SceneKey，1:1 对应 meal）；
 *   - dark：该时段是否深色主题（dinner/midnight），仅用于断言/条件，不驱动色值。
 * tagline 语气由 config/meals.ts 的 mealTaglines 覆盖，这里不重复。
 *
 * 场景硬约束：动画只 transform/opacity 的 CSS keyframes（无 canvas/JS 逐帧，保小程序可迁移）；
 * prefers-reduced-motion 下动画全停但静态场景完整保留（静止帧本身是一幅画）；主内容可读性不降。
 */

import type { MealType } from "@/types/food";

/** 场景键（1:1 对应 meal，PickerScene 据此选渲染哪一幕）。 */
export type SceneKey = "breakfast" | "lunch" | "tea" | "dinner" | "midnight";

export interface MealScene {
  /** 渲染哪一幕场景（选层用，不写 if 链）。 */
  scene: SceneKey;
  /** 深色主题时段（深底浅字，token 块里翻转 ink/surface）。 */
  dark: boolean;
}

/**
 * 五时段场景。色值不在此（在 CSS token 块），此处只定 scene 选层 + dark 断言。
 * V3 起质感由 /scenes/{meal}.webp 板绘底图承担，Scene* 组件只留叠在底图上的动效薄层：
 *  - breakfast 清晨市集：底图（含蒸笼摊子）+ 炊烟 SteamWisp ×2
 *  - lunch     正午通透：底图（纯天空 + 风筝），无动效薄层
 *  - tea       黄昏夕阳：底图（落日 + 光芒），无动效薄层
 *  - dinner    都市夜（深）：底图（天际线亮窗霓虹）+ 星 + 流星
 *  - midnight  深夜月（深）：底图（室内视角：窗外满月 + 暖灯 + 桌上汤面 + 灯下睡猫），无动效薄层
 */
export const MEAL_SCENES: Record<MealType, MealScene> = {
  breakfast: { scene: "breakfast", dark: false },
  lunch: { scene: "lunch", dark: false },
  tea: { scene: "tea", dark: false },
  dinner: { scene: "dinner", dark: true },
  midnight: { scene: "midnight", dark: true },
};

/** 取某 meal 的场景配置。 */
export function mealScene(meal: MealType): MealScene {
  return MEAL_SCENES[meal];
}
