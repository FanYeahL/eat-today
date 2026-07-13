"use client";

/**
 * PickerChooseScreen / 今日菜单板 CHOOSE 首屏（仅 /picker）
 * ─────────────────────────────────────────────
 * 「删到高级」重构后的首屏编排层。视觉概念是「现代菜单票据」——不是复古模板拼贴：
 * 设计感来自暖纸底 + 深墨字 + 票据边框 + 排版节奏 + 一只干净插画餐盘 + 一个轻交互，
 * 全屏无 MCM 图形贴纸。配色收敛到四类：暖纸 / 深墨字 / 一个暖 accent（brand）/
 * 一个冷色（info retro-blue）。只做编排 + 表现：业务状态/回调由父组件（orchestrator）
 * 通过 props 注入，本组件不碰 useDivinationPick/useShops/pick-core，逻辑零耦合。
 *
 * 子组件构成：
 *  - PickerAtmosphere  ← 安静的暖纸背景（纸底 + 纸纹 + 一处极轻暖光晕，零 SVG/零动画）。
 *  - PickerMenuPoster  ← 今日菜单票据（票据边框 + 撕票齿孔 + 餐段徽章 + 大标题 + 食物焦点）。
 *  - PickerFoodStage   ← 食物焦点（插画餐盘 PickerPlate + 盘心缩小 emoji，切餐段一次 pop）。
 *  - PickerBottomAction← 主 CTA（橙红只在主操作出现，静态 Ben-Day 点阵 + tap press-glow）。
 *  - MealTabs / MenuFilter：沿用现有组件（写回同一 Filters/MealType），配色已收敛。
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
            className="flex items-center gap-1 rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.94]"
          >
            {SIDE_ENTRIES.cook.emoji} {SIDE_ENTRIES.cook.label}
          </button>
          <button
            onClick={onOpenDiary}
            className="flex items-center gap-1 rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.94]"
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

      {/* 填空句式筛选：现代白卡（1px 柔边 + soft shadow，无粗描边/无夸张非对称圆角） */}
      <div className="mt-4 rounded-3xl border border-ink/8 bg-surface px-5 py-4 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_8px_24px_rgb(0_0_0_/_0.05)]">
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
