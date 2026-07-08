"use client";

import { meals } from "@/config/meals";
import type { MealType } from "@/types/food";

type MealSwitcherProps = {
  /** 当前选中的餐段 */
  value: MealType;
  /** 切换餐段 */
  onChange: (meal: MealType) => void;
};

/**
 * 餐段切换器
 * 四个餐段横向排开，点亮当前选中项。
 * 抽取据此硬过滤候选池，切换后再摇即换池。
 */
export default function MealSwitcher({ value, onChange }: MealSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label="选择餐段"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {meals.map((m) => {
        const selected = m.type === value;
        return (
          <button
            key={m.type}
            role="radio"
            aria-checked={selected}
            title={m.range}
            onClick={() => onChange(m.type)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
              selected
                ? "border-accent bg-accent-hot/15 text-accent shadow-[0_4px_14px_rgb(var(--c-accent)_/_0.18)]"
                : "border-brand/50 bg-brand/5 text-ink-muted hover:border-accent/60 hover:text-accent"
            }`}
          >
            <span className="text-base leading-none">{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
