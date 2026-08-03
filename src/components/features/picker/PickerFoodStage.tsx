"use client";

/**
 * PickerFoodStage / 食物焦点（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * clean food utility：一只更白更轻的插画餐盘（PickerPlate.Plate）+ 盘后一层极淡暖色圆底
 * 给食欲感 + 盘心一颗稍大、无阴影、无叠加的食物 emoji。去灰重双环、去贴纸，干净有食欲。
 *
 * 动效（两类，都只 transform/opacity + reduced-motion 降级）：
 *  - idle 生命感：整只盘连食物极轻起伏（.picker-food-idle，4.5s 浮 + 微呼吸）——CHOOSE 屏
 *    唯一 idle 循环，只作用于食物焦点，让不操作时也能感知页面是活的。挂在整体浮动包裹上。
 *  - 切餐段：emoji 一次 spring pop（key={meal} 重挂触发 picker-stage-pop）——挂在 emoji span 上，
 *    与 idle 分属不同元素，互不干扰。
 */

import type { MealType } from "@/types/food";
import { Plate } from "./PickerPlate";

/** 餐段 → 盘心食物 emoji（与 MealTabs 图标同源口径：食物系，非时段图标）。
 *  注：midnight 不走此组件（底图自带碗+猫，choose 屏食物焦点整个撤掉），
 *  这里保留 midnight 键仅为类型完整。V4 起 choose 屏不再用食物圆盘（见 PickerHeroText），
 *  本组件留作 picking 悬念屏复用。 */
const STAGE_EMOJI: Record<MealType, string> = {
  breakfast: "🥐",
  lunch: "🍚",
  tea: "🍰",
  dinner: "🍲",
  midnight: "🍜",
};

export default function PickerFoodStage({ meal }: { meal: MealType }) {
  return (
    <div className="relative h-36 w-36 shrink-0">
      {/* idle 浮动包裹：整只盘连食物一起极轻起伏（4.5s，只 transform，reduced-motion 关） */}
      <div className="picker-food-idle absolute inset-0">
        {/* 极淡暖色圆底：给 emoji 一点食欲暖意（无阴影、无边、非贴纸） */}
        <div className="absolute inset-4 rounded-full bg-accent-hot/8" />

        {/* 插画餐盘：近白盘面 + 极轻 ink 盘沿 + 一道更细 brand 弧 */}
        <Plate className="absolute inset-0 h-full w-full text-ink" />

        {/* 盘心食物：稍大、无 drop-shadow、无叠加；切餐段 key 重挂触发一次 spring pop */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            key={meal}
            className="picker-stage-pop select-none text-[3.9rem] leading-none"
          >
            {STAGE_EMOJI[meal]}
          </span>
        </div>
      </div>
    </div>
  );
}
