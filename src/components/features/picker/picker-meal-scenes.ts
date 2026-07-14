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
 *  - breakfast 清晨市集：低太阳 + 摊位剪影 + 炊烟
 *  - lunch     正午通透：自转太阳 + 光柱 + 尘埃 + 白云
 *  - tea       黄昏夕阳：半沉落日 + 放射光芒 + 染色云 + 屋顶剪影
 *  - dinner    都市夜（深）：天际线亮窗 + 星 + 流星
 *  - midnight  深夜月（深）：满月 + 屋顶亮窗 + 黑猫主角 + Zzz
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
