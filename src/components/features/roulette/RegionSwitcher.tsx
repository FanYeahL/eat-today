"use client";

import { regionList } from "@/config/regions-cuisine";
import type { RegionKey } from "@/types/food";

type RegionSwitcherProps = {
  /** 当前选中的口味地区 */
  value: RegionKey;
  /** 切换地区 */
  onChange: (region: RegionKey) => void;
};

/**
 * 口味地区切换器
 * 选自己的口味归属，老虎机据此对主食加权（不硬筛，只调概率，仍保留惊喜）。
 * 选择会被记住（localStorage，在 useRoulette 里处理）。
 */
export default function RegionSwitcher({ value, onChange }: RegionSwitcherProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-ink-muted/80">口味偏好（按你的家乡口味调一调）</span>
      <div
        role="radiogroup"
        aria-label="选择口味地区"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {regionList.map((r) => {
          const selected = r.key === value;
          return (
            <button
              key={r.key}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(r.key)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-all ${
                selected
                  ? "border-accent bg-accent-hot/15 text-accent shadow-[0_4px_14px_rgb(var(--c-accent)_/_0.18)]"
                  : "border-brand/40 bg-brand/5 text-ink-muted hover:border-accent/60 hover:text-accent"
              }`}
            >
              <span className="text-base leading-none">{r.emoji}</span>
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
