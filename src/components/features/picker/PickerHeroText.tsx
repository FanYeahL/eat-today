"use client";

/**
 * PickerHeroText / 天空区 hero 文字块（V4 三段式的 A 区）
 * ─────────────────────────────────────────────
 * 替代 PickerMenuPoster：去掉 emoji 圆盘食物焦点（DEF-4 主遮挡源 + 与板绘质感互相拆台），
 * 只留「餐段徽章 + 大标题 + 一句关心话」，整体锚在画作天空负空间（art 区顶部）。
 * tagline 从画面中部上移至此（修 DEF-4），与徽章/标题紧凑成一块。
 *
 * 文字立足层 scrim（方案 §4.4）：已上移到 PickerLayout 壳层——整宽、从视口顶 y=0 起渐出，
 * 顺带盖住顶栏（避免旧版「缩在 px-5 内边距里、四边硬边的贴纸」问题）。本组件只管文字，
 * 深色时段加 text-shadow 双保险。文字走 --c-ink（深色时段自动翻暖白）。
 * 硬约束：无 backdrop-filter；对比度 ≥4.5:1（壳层 scrim + 时段 ink 保证）。
 */

import type { MealType } from "@/types/food";
import { mealScene } from "./picker-meal-scenes";
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

export default function PickerHeroText({ meal, tagline }: Props) {
  const dark = mealScene(meal).dark;
  return (
    <div className="relative">
      {/* scrim 已上移到 PickerLayout 壳层（整宽、从视口顶起、盖顶栏）——这里不再挂局部渐变，
          避免旧版缩在 px-5 内边距里的硬边贴纸。本块只放文字。 */}
      <div
        className={`relative flex flex-col items-center text-center ${
          dark ? "[text-shadow:0_1px_24px_rgb(0_0_0_/_0.35)]" : ""
        }`}
      >
        {/* 餐段徽章：半透 solid 底，浮在天空上 */}
        <span className="picker-glass meal-transition inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          {MEAL_MENU_LABEL[meal]}
        </span>

        {/* 标题：站在天空上（深色时段自动暖白） */}
        <h1 className="picker-brand meal-transition mt-2 text-[2.9rem] leading-[0.98] text-ink">
          {HERO.title}
        </h1>

        {/* 一句关心话：紧跟标题下（上移到天空区，不再压画面中部） */}
        <p className="meal-transition mt-2 max-w-[18rem] text-sm leading-relaxed text-ink-muted">
          {tagline || HERO.lede}
        </p>
      </div>
    </div>
  );
}
