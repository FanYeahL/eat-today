/**
 * PickerShapes / 复古菜单海报的有机几何（仅 /picker）
 * ─────────────────────────────────────────────
 * 翻译自 uiprompt「retro-midCenturyModern / AtomicHearth」模板的自定义 SVG：
 *   Starburst   星爆       —— 品牌 logo / hero 点缀（MCM 招牌图形）
 *   KidneyShape 肾形有机块  —— hero 背后大色块（atomic-age 家具/餐桌轮廓）
 *   Boomerang   回旋镖      —— 分区/装饰碎片（50s 咖啡桌桌面纹）
 *   AtomicOrbit 原子轨道    —— 极淡背景线框（原子时代符号）
 *
 * 只做 presentational SVG：颜色走本地主题 token（fill/stroke 用 currentColor 或
 * 传入 color），尺寸/动效由使用处的 className 控制。这些形状是 poster 构图的
 * 视觉语言核心（非对称、有机、复古），不是可有可无的贴纸。
 */

type ShapeProps = {
  className?: string;
  /** 显式颜色；默认 currentColor，方便用 text-olive / text-info 等 token 类驱动。 */
  color?: string;
};

/** 星爆：MCM 招牌尖角放射形。 */
export function Starburst({ className, color = "currentColor" }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <path
        d="M50 0 L55 35 L90 20 L65 50 L90 80 L55 65 L50 100 L45 65 L10 80 L35 50 L10 20 L45 35 Z"
        fill={color}
      />
    </svg>
  );
}

/** 肾形：atomic-age 有机大色块（hero 背后主形）。 */
export function KidneyShape({ className, color = "currentColor" }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M40,10 C-10,30 -10,90 40,110 C90,130 140,80 180,90 C210,100 210,40 160,20 C110,0 90,-10 40,10 Z"
        fill={color}
      />
    </svg>
  );
}

/** 回旋镖：50s 装饰碎片。 */
export function Boomerang({ className, color = "currentColor" }: ShapeProps) {
  return (
    <svg viewBox="0 0 100 50" className={className} aria-hidden>
      <path d="M5,45 Q40,40 80,5 Q60,35 95,45 Q50,45 5,45 Z" fill={color} />
    </svg>
  );
}

/** 原子轨道：三椭圆 + 核心点，极淡线框背景符号。 */
export function AtomicOrbit({ className, color = "currentColor" }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      aria-hidden
    >
      <ellipse cx="50" cy="50" rx="45" ry="12" transform="rotate(0 50 50)" />
      <ellipse cx="50" cy="50" rx="45" ry="12" transform="rotate(60 50 50)" />
      <ellipse cx="50" cy="50" rx="45" ry="12" transform="rotate(120 50 50)" />
      <circle cx="50" cy="50" r="4" fill={color} stroke="none" />
    </svg>
  );
}
