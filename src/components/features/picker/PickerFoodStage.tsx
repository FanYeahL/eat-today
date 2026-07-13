"use client";

/**
 * PickerFoodStage / 菜单票据的食物焦点（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * 「删到高级」重构：不再是 MCM 贴纸舞台（票据框 + mix-blend 双圆 + 原子轨道 + 星爆 +
 * 回旋镖 + 大 emoji + drop-shadow）。改成一只干净的插画餐盘（PickerPlate.Plate）+
 * 盘心一颗缩小、无阴影、无叠加的食物 emoji。设计感来自盘本身与排版留白，不靠堆叠。
 *
 * 动效：切餐段时 emoji 一次 spring pop（key={meal} 重挂触发 picker-stage-pop）——
 * CHOOSE 屏唯一的核心动效之一（另一个是 CTA tap 的 press-glow）。无任何环境循环动画。
 * reduced-motion 降级为静态（见 globals.css）。
 */

import type { MealType } from "@/types/food";
import { Plate } from "./PickerPlate";

/** 餐段 → 盘心食物 emoji（与 MealTabs 图标同源口径：食物系，非时段图标）。 */
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
      {/* 插画餐盘：柔白盘面 + 细 ink 盘沿 + 一道 brand 细弧（唯一暖 accent 点缀） */}
      <Plate className="absolute inset-0 h-full w-full text-ink" />

      {/* 盘心食物：缩小、无 drop-shadow、无叠加；切餐段 key 重挂触发一次 spring pop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          key={meal}
          className="picker-stage-pop select-none text-[3.4rem] leading-none"
        >
          {STAGE_EMOJI[meal]}
        </span>
      </div>
    </div>
  );
}
