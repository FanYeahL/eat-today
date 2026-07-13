"use client";

/**
 * PickerFoodStage / 菜单海报「食物舞台」（仅 /picker CHOOSE 屏，首屏视觉中心）
 * ─────────────────────────────────────────────
 * 翻译自 AtomicHearth hero 的「composed poster graphic」：票据框 + mix-blend 双圆
 * + 中央主图 + MCM 图形（原子轨道 / 星爆 / 回旋镖）。中央主图 = 当前餐段食物 emoji，
 * 放大成真正的视觉焦点（不再是角落小配件）。
 *
 * 动效：
 *  - 持续：食物 emoji 轻微上下浮 + rotate（picker-food-float，4.5s）；背后原子轨道
 *    极缓自转（picker-shape-spin，22s）。
 *  - 触发：meal 变化 → key={meal} 让内层重挂 → 一次 spring pop（picker-stage-pop）。
 * 全部 transform/opacity，reduced-motion 降级为静态（见 globals.css）。
 */

import type { MealType } from "@/types/food";
import { Starburst, AtomicOrbit, Boomerang } from "./PickerShapes";

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
    <div className="relative h-[10rem] w-[10rem] shrink-0">
      {/* 票据/餐牌底框：柔白票据 + 深棕描边 + 非对称圆角 + MCM mustard 硬投影 */}
      <div className="absolute inset-0 rounded-tl-[3rem] rounded-br-[3rem] border-2 border-ink/70 bg-surface shadow-[-6px_6px_0_0_rgb(var(--c-mustard))]" />

      {/* 两个 mix-blend 圆：橙 + retro-blue，MCM 叠色（静态，放大铺满票据角） */}
      <div className="absolute left-3 top-3 h-16 w-16 rounded-full bg-brand/65 mix-blend-multiply" />
      <div className="absolute bottom-3 right-3 h-16 w-16 rounded-full bg-info/70 mix-blend-multiply" />

      {/* 背后原子轨道：极缓自转，给食物一个“中心舞台”的环 */}
      <div className="picker-shape-spin absolute inset-4 text-ink/15">
        <AtomicOrbit className="h-full w-full" />
      </div>

      {/* 角落星爆 + 回旋镖：MCM 招牌点缀 */}
      <div className="absolute -right-3 -top-4 h-9 w-9 text-accent">
        <Starburst className="h-full w-full" />
      </div>
      <div className="absolute -bottom-3 -left-3 h-6 w-11 text-olive/70">
        <Boomerang className="h-full w-full" />
      </div>

      {/* 中央主食物（视觉焦点）：常态漂浮；meal 变化 → key 重挂触发 spring pop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          key={meal}
          className="picker-stage-pop select-none text-[4.6rem] leading-none drop-shadow-[0_6px_10px_rgba(44,36,22,0.22)]"
        >
          <span className="picker-food-float inline-block">
            {STAGE_EMOJI[meal]}
          </span>
        </span>
      </div>
    </div>
  );
}
