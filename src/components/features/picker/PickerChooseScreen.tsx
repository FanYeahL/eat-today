"use client";

/**
 * PickerChooseScreen / 今日菜单板 CHOOSE 首屏（仅 /picker）
 * ─────────────────────────────────────────────
 * 从 UniversalFoodPicker 抽出的首屏表现层，翻译自 uiprompt
 * 「retro-midCenturyModern / AtomicHearth」的复古菜单海报语言（见下方映射）。
 * 只做编排 + 表现：所有业务状态/回调由父组件（orchestrator）通过 props 注入，
 * 本组件不碰 useDivinationPick/useShops/pick-core，逻辑零耦合。
 *
 * uiprompt 模板映射（主模板 AtomicHearth，辅助借 PopArt 点阵）：
 *  - PickerAtmosphere  ← AtomicHearth hero 背景「abstract shapes」构图（KidneyShape/
 *    Starburst/AtomicOrbit/Boomerang + warm-beige 纸底 + 慢漂移 animate-*）。
 *  - PickerMenuPoster  ← AtomicHearth hero 不对称 poster（"Est." 徽章 + 大标题左 +
 *    graphic 右 + 非对称圆角 + 深棕字压暖底，非红底白字）。
 *  - PickerFoodStage   ← AtomicHearth hero 的 composed poster graphic（白票据框 +
 *    mix-blend 双圆 + 中央主图），主图换成餐段食物 emoji。
 *  - PickerBottomAction← AtomicHearth CTA（MCM offset hard-shadow + 深棕描边），
 *    橙红只在主操作出现；点阵取自 PopArt 的 Ben-Day dots（.picker-dots）。
 *  - MealTabs / MenuFilter：沿用现有组件（写回同一 Filters/MealType），只调其视觉。
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
            className="h-6 w-[3px] rounded-full bg-gradient-to-b from-accent-hot to-mustard"
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
            className="flex items-center gap-1 rounded-full border-2 border-ink/15 bg-surface/80 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.94]"
          >
            {SIDE_ENTRIES.cook.emoji} {SIDE_ENTRIES.cook.label}
          </button>
          <button
            onClick={onOpenDiary}
            className="flex items-center gap-1 rounded-full border-2 border-ink/15 bg-surface/80 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.94]"
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

      {/* 餐段 tab：奶油 pill 容器（选中白底 + coral 字，见 MealTabs） */}
      <div className="mt-5">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-ink-muted/70">
          这会儿是
        </span>
        <MealTabs value={meal} onChange={onChangeMeal} />
      </div>

      {/* 填空句式筛选：白票据卡（深棕描边 + 非对称圆角），slot 已改高对比 mustard 芯片 */}
      <div className="mt-4 rounded-2xl rounded-bl-[3rem] border-2 border-ink/12 bg-surface/85 px-5 py-4 shadow-[0_12px_30px_rgb(var(--c-ink)_/_0.08)]">
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
