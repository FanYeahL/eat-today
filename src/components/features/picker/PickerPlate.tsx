/**
 * PickerPlate / 食物焦点的插画餐盘（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * clean food utility 重构：更白更轻、去灰重双环。构成极简：
 *   - 盘面：近白 surface 填充（更白、有食欲）
 *   - 盘沿：一圈极轻 ink 描边环（0.12，餐盘轮廓，不显灰重）
 *   - 点缀：右上一道更细的 brand 弧（1.6，唯一暖 accent，克制）
 * 内圈压印环已删（减一环，不要灰双环）。emoji 由使用处叠在盘心（无阴影、无叠加）。
 * 纯 presentational SVG，颜色走 token。
 */

type PlateProps = {
  className?: string;
  /** 盘沿描边色；默认 currentColor，方便用 text-ink 等 token 类驱动。 */
  color?: string;
};

/** 插画餐盘：近白盘面 + 极轻 ink 盘沿 + 一道更细 brand 弧。 */
export function Plate({ className, color = "currentColor" }: PlateProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {/* 盘面：近白瓷盘（更白、有食欲） */}
      <circle cx="50" cy="50" r="46" fill="rgb(var(--c-surface))" />
      {/* 盘沿：极轻 ink 描边环（餐盘轮廓，不显灰重） */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={color}
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
      {/* 右上一道更细的 brand 弧：唯一暖 accent 点缀 */}
      <path
        d="M78 30 A46 46 0 0 1 84 54"
        fill="none"
        stroke="rgb(var(--c-brand))"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
