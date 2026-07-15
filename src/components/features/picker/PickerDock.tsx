"use client";

/**
 * PickerDock / 点餐坞（V4 三段式的 C 区）
 * ─────────────────────────────────────────────
 * 把餐段 tab / 筛选 / CTA / 弱入口页脚收进单一 .picker-glass 圆角坞（方案 §3.1 P3「控件入坞」），
 * 上缘为实体边界，自然接住画的下沿（替代旧 62vh mask 渐隐，修 DEF-3）。
 * 重要性自上而下递增：tab → 筛选 → CTA（落拇指热区）→ 弱入口页脚。
 *
 * CTA 从原 PickerBottomAction（fixed 底栏）迁入坞内：保留 btnRef + press-glow tap 反馈、
 * 固定 --c-cta-* tomato 白字、active:scale。casting 时置灰变文案。
 * 硬约束：无 backdrop-filter（.picker-glass 是半透 solid）；动画只 transform/opacity。
 */

import MealTabs from "./MealTabs";
import MenuFilter from "./MenuFilter";
import StyleSwitch from "@/components/common/StyleSwitch";
import { PICK_CTA, SIDE_ENTRIES } from "./picker-copy";
import type { Filters } from "@/lib/pick-core";
import type { MealType, RegionKey } from "@/types/food";

type Props = {
  meal: MealType;
  filters: Filters;
  region: RegionKey;
  casting: boolean;
  pickBtnRef: React.RefObject<HTMLButtonElement>;
  onPick: () => void;
  onChangeMeal: (m: MealType) => void;
  onChangeFilters: (f: Filters) => void;
  onChangeRegion: (r: RegionKey) => void;
  onOpenCook: () => void;
  onOpenDiary: () => void;
};

export default function PickerDock({
  meal,
  filters,
  region,
  casting,
  pickBtnRef,
  onPick,
  onChangeMeal,
  onChangeFilters,
  onChangeRegion,
  onOpenCook,
  onOpenDiary,
}: Props) {
  return (
    <div className="picker-glass meal-transition rounded-t-[28px] px-4 pb-5 pt-4 lg:rounded-[28px] lg:pb-6 lg:pt-5">
      {/* 餐段 tab（segmented，选中态见 MealTabs） */}
      <MealTabs value={meal} onChange={onChangeMeal} />

      {/* 填空句式筛选（透明容器，直接排在坞里，不再套第二层卡） */}
      <div className="mt-3">
        <MenuFilter
          value={filters}
          onChange={onChangeFilters}
          region={region}
          onRegionChange={onChangeRegion}
        />
      </div>

      {/* 主 CTA：坞内、落拇指热区。保留 btnRef + press-glow + 固定 tomato。 */}
      <button
        ref={pickBtnRef}
        onClick={onPick}
        onAnimationEnd={(e) => {
          if (e.animationName.includes("press-glow")) {
            pickBtnRef.current?.classList.remove("picker-press-glow");
          }
        }}
        disabled={casting}
        className="mt-4 w-full rounded-2xl bg-[rgb(var(--c-cta-a))] py-4 text-lg font-bold tracking-wide text-white shadow-[0_6px_20px_rgb(var(--c-cta-a)_/_0.28)] transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {casting ? "正在为你挑…" : PICK_CTA}
      </button>

      {/* 弱入口页脚：自己做 · 吃饭记录 · 彩蛋，一行弱文字链（替代顶栏两个 chip 的重复） */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-ink-muted/70">
        <button
          onClick={onOpenCook}
          className="inline-flex items-center gap-1 transition-transform duration-100 active:scale-[0.94]"
        >
          {SIDE_ENTRIES.cook.emoji} {SIDE_ENTRIES.cook.label}
        </button>
        <span aria-hidden className="text-ink-muted/30">
          ·
        </span>
        <button
          onClick={onOpenDiary}
          className="inline-flex items-center gap-1 transition-transform duration-100 active:scale-[0.94]"
        >
          {SIDE_ENTRIES.diary.emoji} {SIDE_ENTRIES.diary.label}
        </button>
        <span aria-hidden className="text-ink-muted/30">
          ·
        </span>
        <StyleSwitch
          to="classic"
          className="inline-flex items-center gap-1 transition-transform duration-100 active:scale-[0.94]"
        >
          👀 点我会怎样
        </StyleSwitch>
      </div>
    </div>
  );
}
