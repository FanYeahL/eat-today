"use client";

/**
 * PickerMenuPoster / 今日菜单海报（hero，仅 /picker CHOOSE 屏，首屏核心构图）
 * ─────────────────────────────────────────────
 * 翻译自 AtomicHearth hero 的不对称 poster 构图，但把「趣味」收进卡片内部：
 *   顶行：餐段票据徽章（早饭菜单 / MENU TICKET，随 meal 动态，不与顶部品牌重复）+ 大标题；
 *   中央：食物舞台（PickerFoodStage）放大成视觉焦点，背后 KidneyShape 有机色块；
 *   下方：一句定位关心话。
 * 深棕字压在暖米/柔白底上（非红底白字广告卡）；左侧 mustard→orange 细书脊锚点。
 * 卡内自带 MCM 图形（食物舞台的轨道/星爆/回旋镖 + 背后肾形），手机首屏也有模板感。
 */

import type { MealType } from "@/types/food";
import PickerFoodStage from "./PickerFoodStage";
import { KidneyShape } from "./PickerShapes";
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
    <div className="relative mt-3 overflow-hidden rounded-[1.5rem] rounded-tr-[3.75rem] border-2 border-ink/12 bg-surface/90 px-5 pb-6 pt-5 shadow-[0_18px_40px_rgb(var(--c-ink)_/_0.1)]">
      {/* 左侧 mustard→orange 细书脊 */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-mustard to-brand"
      />

      {/* 顶行：餐段票据徽章 + 大标题 */}
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-md border-2 border-ink/70 bg-mustard/25 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink">
            {MEAL_MENU_LABEL[meal]}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-muted/60">
            Menu Ticket
          </span>
        </div>
        <h1 className="picker-brand mt-2 text-[2.9rem] leading-[0.96] text-ink">
          {HERO.title}
        </h1>
      </div>

      {/* 中央：食物舞台（视觉焦点）+ 背后有机肾形色块（MCM 分区色） */}
      <div className="relative mt-4 flex items-center justify-center">
        <div className="absolute inset-x-2 top-2 -z-0 h-32 text-brand/18">
          <KidneyShape className="h-full w-full" />
        </div>
        <div className="relative z-10">
          <PickerFoodStage meal={meal} />
        </div>
      </div>

      {/* 下方：一句定位关心话 */}
      <p className="relative z-10 mt-4 text-center text-sm leading-relaxed text-ink-muted">
        {tagline || HERO.lede}
      </p>
    </div>
  );
}
