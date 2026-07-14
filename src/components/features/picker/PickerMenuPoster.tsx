"use client";

/**
 * PickerMenuPoster / 今日菜单 hero（仅 /picker CHOOSE 屏，首屏核心）
 * ─────────────────────────────────────────────
 * 场景舞台重构：去掉白卡壳，徽章/大标题/食物焦点/tagline 直接排在场景视窗（天空）上，
 * 「食物坐在晨光/夕阳里」。文字走 --c-ink（深色时段自动翻暖白，站在深天空上仍可读）。
 * 徽章用半透 solid 底（.picker-glass）浮在天空上；无卡壳、无 soft shadow 框。
 * 小屏：食物焦点允许骑在地平线上（盘下缘压过剪影带），不硬塞进视窗。
 *
 * 构成：餐段徽章 + 大标题「今天吃什么」+ 食物焦点（PickerFoodStage）+ 一句关心话。
 */

import type { MealType } from "@/types/food";
import PickerFoodStage from "./PickerFoodStage";
import { HERO } from "./picker-copy";

/** 餐段 → 徽章文案（不复用顶部品牌「今日菜单板」，避免重复）。 */
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
    <div className="relative mt-3 flex flex-col items-center text-center">
      {/* 餐段徽章：半透 solid 底，浮在天空上 */}
      <span className="picker-glass meal-transition inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {MEAL_MENU_LABEL[meal]}
      </span>

      {/* 标题：站在天空上（深色时段自动暖白） */}
      <h1 className="picker-brand meal-transition mt-2 text-[2.9rem] leading-[0.98] text-ink">
        {HERO.title}
      </h1>

      {/* 食物焦点：视窗中下部，地平线剪影在其后 */}
      <div className="mt-3 flex items-center justify-center">
        <PickerFoodStage meal={meal} />
      </div>

      {/* 一句关心话 */}
      <p className="meal-transition mt-3 max-w-[18rem] text-sm leading-relaxed text-ink-muted">
        {tagline || HERO.lede}
      </p>
    </div>
  );
}
