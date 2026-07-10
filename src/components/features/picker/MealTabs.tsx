"use client";

/**
 * 今日菜单板 · 餐段 tab（picker 专属，非共享的 MealSwitcher）
 * ─────────────────────────────────────────────
 * 交互重点：选中项一个「滑块」平移过去 + 轻微回弹（layout 动画，
 * 小程序里可用 class toggle + transition 平移实现）。
 * 只用 transform/opacity，时长 200ms 档（chip/tab transition）。
 * tap 反馈交给按钮的 active:scale。旧页仍用 water/MealSwitcher，互不影响。
 */

import { motion } from "framer-motion";
import { meals } from "@/config/meals";
import type { MealType } from "@/types/food";

type MealTabsProps = {
  value: MealType;
  onChange: (meal: MealType) => void;
};

/**
 * picker 本地餐段图标覆盖：统一为「食物系」emoji（共享 meals config 里混了
 * 🌅☀️🌆🌙 时段图标 + 🍰，不统一；🌆 晚饭更不像吃饭）。只在 picker 覆盖展示，
 * 不改 config（旧 /water-concept 仍用原图标）。抽取逻辑只认 m.type，与图标无关。
 */
const MEAL_ICON: Record<MealType, string> = {
  breakfast: "🥐",
  lunch: "🍚",
  tea: "🍰",
  dinner: "🍜",
  midnight: "🍢",
};

export default function MealTabs({ value, onChange }: MealTabsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="选择餐段"
      className="flex items-stretch gap-1 rounded-2xl bg-surface-2/60 p-1"
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
            className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-xs font-semibold transition-transform duration-100 active:scale-[0.94]"
          >
            {/* 选中滑块：用同一 layoutId 在选项间平移 + 轻回弹 */}
            {selected && (
              <motion.span
                layoutId="meal-tab-slider"
                aria-hidden
                className="absolute inset-0 -z-0 rounded-xl bg-surface shadow-[0_4px_12px_rgb(var(--c-accent)_/_0.16)]"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
              />
            )}
            <span
              className={`relative z-10 text-lg leading-none transition-transform duration-200 ${
                selected ? "scale-110" : "scale-100"
              }`}
            >
              {MEAL_ICON[m.type]}
            </span>
            <span
              className={`relative z-10 leading-none transition-colors duration-200 ${
                selected ? "text-accent" : "text-ink-muted/70"
              }`}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
