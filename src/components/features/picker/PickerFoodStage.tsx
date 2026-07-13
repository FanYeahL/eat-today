"use client";

/**
 * PickerFoodStage / 菜单海报右侧「食物舞台」（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * 翻译自 AtomicHearth hero 的「composed poster graphic」：白票据框 + 两个
 * mix-blend 圆 + 中央主图。这里中央主图换成当前餐段的食物 emoji。
 *
 * 动效：
 *  - 持续：食物 emoji 轻微上下浮 + rotate（picker-food-float，4.5s，低频）。
 *  - 触发：meal 变化时，用 key={meal} 让内层重挂 → 播放一次 spring pop
 *    （picker-stage-pop）。两者叠加：常态漂浮，切餐段时“端上新的一道”。
 * 全部 transform/opacity，reduced-motion 降级为静态（见 globals.css）。
 */

import type { MealType } from "@/types/food";
import { Starburst } from "./PickerShapes";

/** 餐段 → 舞台主食物 emoji（与 MealTabs 的图标同源口径：食物系，非时段图标）。 */
const STAGE_EMOJI: Record<MealType, string> = {
  breakfast: "🥐",
  lunch: "🍚",
  tea: "🍰",
  dinner: "🍲",
  midnight: "🍜",
};

export default function PickerFoodStage({ meal }: { meal: MealType }) {
  return (
    <div className="relative h-[7.5rem] w-[7.5rem] shrink-0">
      {/* 票据/餐牌底框：白票据 + 深棕描边 + 非对称圆角（poster 感） */}
      <div className="absolute inset-0 rounded-tl-[2.4rem] rounded-br-[2.4rem] border-2 border-ink/70 bg-surface shadow-[-5px_5px_0_0_rgb(var(--c-mustard))]" />

      {/* 两个 mix-blend 圆：橙 + retro-blue，MCM 叠色（静态） */}
      <div className="absolute left-2 top-2 h-12 w-12 rounded-full bg-brand/70 mix-blend-multiply" />
      <div className="absolute bottom-2 right-2 h-12 w-12 rounded-full bg-info/70 mix-blend-multiply" />

      {/* 角落星爆小点缀 */}
      <div className="absolute -right-3 -top-3 h-7 w-7 text-accent">
        <Starburst className="h-full w-full" />
      </div>

      {/* 中央主食物：常态漂浮；meal 变化 → key 重挂触发 spring pop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          key={meal}
          className="picker-stage-pop select-none text-[2.9rem] leading-none"
        >
          <span className="picker-food-float inline-block">
            {STAGE_EMOJI[meal]}
          </span>
        </span>
      </div>
    </div>
  );
}
