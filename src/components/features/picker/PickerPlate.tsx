/**
 * PickerPlate / 菜单票据里的插画餐盘（仅 /picker CHOOSE 屏的食物焦点底盘）
 * ─────────────────────────────────────────────
 * 「删到高级」重构后的唯一图形：一只干净的插画感餐盘，撑住食物焦点的设计感——
 * 不是 MCM 四件套贴纸，不从 PickerShapes.tsx import。构成极简：
 *   - 盘面：柔白/暖纸 base 填充（像瓷盘）
 *   - 盘沿：一圈细 ink 描边环（餐盘轮廓）
 *   - 内圈：一道极淡 ink 内环线（瓷盘的压印线，纸感留白）
 *   - 点缀：右上一道短 brand（暖橙）细弧，唯一暖 accent，克制不喧闹
 * emoji 由使用处叠在盘心（缩小、无 drop-shadow）。纯 presentational SVG，颜色走 token。
 */

type PlateProps = {
  className?: string;
  /** 盘沿描边色；默认 currentColor，方便用 text-ink 等 token 类驱动。 */
  color?: string;
};

/** 插画餐盘：柔白盘面 + 细 ink 盘沿 + 淡内环 + 一道 brand 细弧。 */
export function Plate({ className, color = "currentColor" }: PlateProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {/* 盘面：暖纸柔白瓷盘 */}
      <circle cx="50" cy="50" r="46" fill="rgb(var(--c-surface))" />
      {/* 盘沿：细 ink 描边环（餐盘轮廓） */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={color}
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      {/* 内环压印线：极淡，给瓷盘的层次 */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke={color}
        strokeOpacity="0.12"
        strokeWidth="1"
      />
      {/* 右上一道短 brand 细弧：唯一暖 accent 点缀 */}
      <path
        d="M78 30 A46 46 0 0 1 84 54"
        fill="none"
        stroke="rgb(var(--c-brand))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
