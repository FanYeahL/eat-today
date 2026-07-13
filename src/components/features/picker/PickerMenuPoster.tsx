"use client";

/**
 * PickerMenuPoster / 今日菜单票据（hero，仅 /picker CHOOSE 屏，首屏核心）
 * ─────────────────────────────────────────────
 * 「删到高级」重构：不再是复古 poster 拼贴（mustard 书脊 + 背后 KidneyShape + MCM 图形）。
 * 改成一张干净的「今日菜单票据」——设计感来自暖纸柔白卡、深墨字、票据边框（一个非对称
 * 圆角 + 左侧撕票齿孔虚线边）、排版节奏，加一只插画餐盘（PickerFoodStage）作食物焦点。
 * 全屏无 MCM 贴纸；暖 accent 只有 brand，冷色只有 info（retro-blue），克制收敛。
 *
 * 构成：
 *   顶行：餐段徽章（早饭菜单…，随 meal 动态，中性 ink 字）+ Menu Ticket 微标签（info 冷色）；
 *   标题：今天吃什么（品牌字）；
 *   中央：插画餐盘 + 盘心食物 emoji（视觉焦点）；
 *   下方：一句定位关心话。
 */

import type { MealType } from "@/types/food";
import PickerFoodStage from "./PickerFoodStage";
import { HERO } from "./picker-copy";

/** 餐段 → 票据徽章文案（不复用顶部品牌「今日菜单板」，避免重复）。 */
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
    <div className="relative mt-3 overflow-hidden rounded-2xl rounded-tr-[2.75rem] border border-ink/12 bg-surface pb-6 pl-7 pr-5 pt-5">
      {/* 左侧撕票齿孔：细虚线边，给「票据」的实物感（纯装饰，非色块书脊） */}
      <span
        aria-hidden
        className="absolute inset-y-4 left-3 border-l-2 border-dashed border-ink/15"
      />

      {/* 顶行：餐段徽章（中性 ink）+ Menu Ticket 微标签（info 冷色） */}
      <div className="flex items-center gap-2">
        <span className="inline-block rounded-md border border-ink/25 bg-base px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink">
          {MEAL_MENU_LABEL[meal]}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-info">
          Menu Ticket
        </span>
      </div>

      {/* 标题 */}
      <h1 className="picker-brand mt-2 text-[2.9rem] leading-[0.96] text-ink">
        {HERO.title}
      </h1>

      {/* 中央：插画餐盘 + 盘心食物（视觉焦点） */}
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
