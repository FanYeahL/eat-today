"use client";

/**
 * PickerChooseScreen / 今日菜单板 CHOOSE 首屏（仅 /picker）
 * ─────────────────────────────────────────────
 * V4 三段式重构后的薄编排层：装配 PickerLayout（壳）+ 顶栏品牌行 + PickerHeroText（天空区 hero）
 * + PickerDock（点餐坞）。背景整幕场景由 PickerScene 在 orchestrator 里渲染（z-0），本屏内容
 * （z-10）浮其上。只做装配 + 表现：业务状态/回调由父组件 props 注入，不碰
 * useDivinationPick/useShops/pick-core。
 *
 * 旧结构（单列卡片流 + 中部 emoji 圆盘 + fixed 底部 CTA）已退役：
 *  - hero 去圆盘 → PickerHeroText（徽章+标题+tagline 上移，见 DEF-4）；
 *  - tab/筛选/CTA/弱入口 → 收进 PickerDock 单一坞（DEF-3/P3）；
 *  - 顶栏两个工具 chip → 下沉到坞页脚（修 chip 折行 DEF-5）。
 */

import PickerLayout from "./PickerLayout";
import PickerHeroText from "./PickerHeroText";
import PickerDock from "./PickerDock";
import { HERO, EXHAUSTED_HINT } from "./picker-copy";
import type { Filters } from "@/lib/pick-core";
import type { MealType, RegionKey } from "@/types/food";

type Props = {
  meal: MealType;
  filters: Filters;
  region: RegionKey;
  tagline: string;
  exhausted: boolean;
  casting: boolean;
  pickBtnRef: React.RefObject<HTMLButtonElement>;
  onPick: () => void;
  onChangeMeal: (m: MealType) => void;
  onChangeFilters: (f: Filters) => void;
  onChangeRegion: (r: RegionKey) => void;
  onOpenCook: () => void;
  onOpenDiary: () => void;
};

export default function PickerChooseScreen({
  meal,
  filters,
  region,
  tagline,
  exhausted,
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
    <PickerLayout
      topbar={
        /* 顶栏：品牌字（左）。工具入口下沉到坞页脚，这里只留品牌行，右侧留白给画。 */
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-6 w-[3px] rounded-full bg-brand" />
          <div className="flex flex-col leading-none">
            <span className="picker-brand text-lg text-ink">{HERO.board}</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-muted/60">
              {HERO.brand}
            </span>
          </div>
        </div>
      }
      hero={
        <>
          <PickerHeroText meal={meal} tagline={tagline} />
          {exhausted && (
            <p className="mt-3 text-center text-sm font-semibold text-accent-hot">
              {EXHAUSTED_HINT}
            </p>
          )}
        </>
      }
      dock={
        <PickerDock
          meal={meal}
          filters={filters}
          region={region}
          casting={casting}
          pickBtnRef={pickBtnRef}
          onPick={onPick}
          onChangeMeal={onChangeMeal}
          onChangeFilters={onChangeFilters}
          onChangeRegion={onChangeRegion}
          onOpenCook={onOpenCook}
          onOpenDiary={onOpenDiary}
        />
      }
    />
  );
}
