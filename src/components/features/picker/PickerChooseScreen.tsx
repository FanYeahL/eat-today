"use client";

/**
 * PickerChooseScreen / 今日菜单板 CHOOSE 首屏（仅 /picker）
 * ─────────────────────────────────────────────
 * 场景舞台重构后的首屏编排层：背景是按 meal 换的整幕场景（PickerScene，在 orchestrator 里渲染），
 * 本屏内容浮在场景上——上半（场景视窗/天空）放品牌行 + hero（徽章/标题/食物焦点），下半（桌面区）
 * 放餐段 tab / 筛选卡 / CTA，用半透 solid 卡（.picker-glass，无 blur）透出场景氛围色。
 * 只做编排 + 表现：业务状态/回调由父组件通过 props 注入，本组件不碰 useDivinationPick/useShops/pick-core。
 *
 * 子组件构成：
 *  - PickerMenuPoster  ← hero（去白卡：徽章 + 大标题 + 食物焦点 + tagline 直接排在天空上）。
 *  - PickerFoodStage   ← 食物焦点（插画餐盘 + emoji，idle 起伏 + 切餐段一次 pop）。
 *  - PickerBottomAction← 主 CTA（固定 --c-cta-* tomato，全时段最醒目）。
 *  - MealTabs / MenuFilter：沿用现有组件（写回同一 Filters/MealType），容器改半透 solid。
 */

import PickerMenuPoster from "./PickerMenuPoster";
import PickerBottomAction from "./PickerBottomAction";
import MealTabs from "./MealTabs";
import MenuFilter from "./MenuFilter";
import StyleSwitch from "@/components/common/StyleSwitch";
import { HERO, SIDE_ENTRIES, EXHAUSTED_HINT } from "./picker-copy";
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
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      {/* 顶栏：品牌字（左）+ 工具入口（右上角，两个弱 chip） */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-6 w-[3px] rounded-full bg-brand"
          />
          <div className="flex flex-col leading-none">
            <span className="picker-brand text-lg text-ink">{HERO.board}</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-muted/60">
              {HERO.brand}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCook}
            className="picker-glass meal-transition flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.94]"
          >
            {SIDE_ENTRIES.cook.emoji} {SIDE_ENTRIES.cook.label}
          </button>
          <button
            onClick={onOpenDiary}
            className="picker-glass meal-transition flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.94]"
          >
            {SIDE_ENTRIES.diary.emoji} {SIDE_ENTRIES.diary.label}
          </button>
        </div>
      </div>

      {/* 彩蛋入口：工具区下面、右对齐、极弱（切回经典水占版并记住选择）。 */}
      <div className="mt-2 flex justify-end">
        <StyleSwitch
          to="classic"
          className="inline-flex items-center gap-1 rounded-full border border-ink/12 bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-ink-muted/70 transition-transform duration-100 active:scale-[0.94]"
        >
          👀 点我会怎样
        </StyleSwitch>
      </div>

      {/* Hero：今日菜单海报 */}
      <PickerMenuPoster meal={meal} tagline={tagline} />

      {/* 餐段 tab：奶油 pill 容器（选中白底 + info 字，见 MealTabs） */}
      <div className="mt-5">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-ink-muted/70">
          这会儿是
        </span>
        <MealTabs value={meal} onChange={onChangeMeal} />
      </div>

      {/* 填空句式筛选：半透 solid 卡（浮在桌面区，透出场景氛围色） */}
      <div className="picker-glass meal-transition mt-4 rounded-3xl px-5 py-4">
        <MenuFilter
          value={filters}
          onChange={onChangeFilters}
          region={region}
          onRegionChange={onChangeRegion}
        />
      </div>

      {exhausted && (
        <p className="mt-4 text-sm font-semibold text-accent-hot">
          {EXHAUSTED_HINT}
        </p>
      )}

      {/* 弹性留白：内容上半分布，底部 CTA 在其上浮 */}
      <div className="flex-1" />

      {/* 底部固定点餐按钮 */}
      <PickerBottomAction btnRef={pickBtnRef} onPick={onPick} casting={casting} />
    </div>
  );
}
