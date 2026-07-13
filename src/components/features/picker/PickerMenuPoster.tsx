"use client";

/**
 * PickerMenuPoster / 今日菜单海报（hero，仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * 翻译自 AtomicHearth hero 的不对称 poster 构图：
 *   左：小标徽章（"Est." 复古印章口吻）+ 品牌大标题 + 一句定位 + 品牌副标；
 *   右：食物舞台（PickerFoodStage，票据框 + 浮动食物）。
 * 深棕字压在暖米/柔白底上（非红底白字广告卡）；左侧 mustard 细色条做书脊锚点。
 * 非对称圆角（rounded-tr 巨大）呼应 biophilic/organic 语言。
 */

import type { MealType } from "@/types/food";
import PickerFoodStage from "./PickerFoodStage";
import { HERO } from "./picker-copy";

type Props = {
  meal: MealType;
  /** 当前餐段的一句关心话（tagline）；空时回落 HERO.lede。 */
  tagline: string;
};

export default function PickerMenuPoster({ meal, tagline }: Props) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-[1.5rem] rounded-tr-[3.75rem] border-2 border-ink/12 bg-surface/90 px-5 pb-6 pt-6 shadow-[0_18px_40px_rgb(var(--c-ink)_/_0.1)]">
      {/* 左侧 mustard→orange 细书脊 */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-mustard to-brand"
      />

      <div className="flex items-center gap-3">
        {/* 左：徽章 + 标题 + 定位句 */}
        <div className="min-w-0 flex-1">
          <span className="mb-2 inline-block rounded-full border-2 border-ink/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/75">
            {HERO.board}
          </span>
          <h1 className="picker-brand text-[2.6rem] leading-[0.98] text-ink">
            {HERO.title}
          </h1>
          <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-ink-muted">
            {tagline || HERO.lede}
          </p>
        </div>

        {/* 右：食物舞台 */}
        <PickerFoodStage meal={meal} />
      </div>
    </div>
  );
}
