"use client";

/**
 * PickerMenuPoster / 今日菜单卡（hero，仅 /picker CHOOSE 屏，首屏核心）
 * ─────────────────────────────────────────────
 * clean food utility 重构：不再是复古票据（撕票齿孔虚线 + 硬边徽章 + 夸张非对称圆角 +
 * Menu Ticket 英文微标签）。改成一张干净的现代卡片——近白卡 + 1px 柔边 + soft shadow +
 * 统一圆角，设计感来自留白与排版节奏，加一只更有食欲的食物焦点（PickerFoodStage）。
 *
 * 构成：
 *   顶行：餐段徽章（早饭菜单…，随 meal 动态，浅底中性字）；
 *   标题：今天吃什么（品牌字）；
 *   中央：食物焦点（暖圆底 + emoji）；
 *   下方：一句定位关心话。
 */

import type { MealType } from "@/types/food";
import PickerFoodStage from "./PickerFoodStage";
import { HERO } from "./picker-copy";

/** 餐段 → 卡片徽章文案（不复用顶部品牌「今日菜单板」，避免重复）。 */
const MEAL_MENU_LABEL: Record<MealType, string> = {
  breakfast: "早饭菜单",
  lunch: "午饭菜单",
  tea: "下午茶菜单",
  dinner: "晚饭菜单",
  midnight: "夜宵菜单",
};

type Props = {
  meal: MealType;
  /** 当前餐段的一句关心话（tagline）；空时回落 HERO.lede。 */
  tagline: string;
};

export default function PickerMenuPoster({ meal, tagline }: Props) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-3xl border border-ink/8 bg-surface px-5 pb-6 pt-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_8px_24px_rgb(0_0_0_/_0.06)]">
      {/* 顶行：餐段徽章（浅底中性字，无硬边） */}
      <div className="flex items-center gap-2">
        <span className="inline-block rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          {MEAL_MENU_LABEL[meal]}
        </span>
      </div>

      {/* 标题 */}
      <h1 className="picker-brand mt-2 text-[2.9rem] leading-[0.96] text-ink">
        {HERO.title}
      </h1>

      {/* 中央：食物焦点（暖圆底 + emoji） */}
      <div className="mt-4 flex items-center justify-center">
        <PickerFoodStage meal={meal} />
      </div>

      {/* 下方：一句定位关心话 */}
      <p className="mt-4 text-center text-sm leading-relaxed text-ink-muted">
        {tagline || HERO.lede}
      </p>
    </div>
  );
}
