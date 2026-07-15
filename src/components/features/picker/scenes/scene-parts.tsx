/**
 * scene-parts / 场景共享零件（纯 presentational，颜色走 token）
 * ─────────────────────────────────────────────
 * V3 起场景质感由 /scenes/{meal}.webp 板绘底图承担，旧 SVG 几何零件（LightDisc / RayFan /
 * Cloud / Bird / SleepingCat / Zzz / SilhouetteBand）已全数退役。此文件只留仍叠在底图上的
 * 动效薄层：Stars（星野）、Meteor（流星）、SteamWisp（炊烟）。
 * 全部只用 SVG / div + transform/opacity 动画类（picker-scene-*，见 globals.css）；
 * 静止帧即完整可见，reduced-motion 由全局 catch-all 停。
 */

import type { CSSProperties } from "react";

/** 星野：一层 div 里若干正圆小点，三档 twinkle 错峰。
 *  用 div + border-radius:50% 而非 SVG 缩放——SVG viewBox 铺满非等比容器会把圆点拉成椭圆。
 *  x/y 直接当百分比用（相对星空带容器），点径 = 2r px（1–2px）。
 *  V4：星空带高度改用 bandBottomPct（画框百分比，来自 art-meta 的 meteorBand[1]），
 *  不再写死 38vh——底图铺满 art 区、桌面栏与视口解耦后跟画框走才不飘。 */
export function Stars({
  points,
  bandBottomPct = 38,
}: {
  points: { x: number; y: number; r: number; speed: "a" | "b" | "c" }[];
  /** 星空带底边占画框高的百分比（默认 38）。 */
  bandBottomPct?: number;
}) {
  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{ height: `${bandBottomPct}%` }}
    >
      {points.map((p, i) => (
        <div
          key={i}
          className={`picker-scene-twinkle-${p.speed} absolute`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r * 2,
            height: p.r * 2,
            borderRadius: "50%",
            background: "#FFFFFF",
          }}
        />
      ))}
    </div>
  );
}

/** 流星：渐变尾迹细线，沿自身轴斜下坠划过（周期由 duration 定），起点/角度由 style + angle 定。
 *  角度经 --meteor-angle 交给 keyframe（在旋转后的轴上 translateX），尾迹与轨迹共线。 */
export function Meteor({
  style,
  duration,
  delay,
  angle = 35,
}: {
  style?: CSSProperties;
  duration: number;
  delay: number;
  angle?: number;
}) {
  return (
    <div
      className="picker-scene-meteor absolute"
      style={{
        width: 100,
        height: 2,
        background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.9))",
        transformOrigin: "left center",
        ["--meteor-angle" as string]: `${angle}deg`,
        animationName: "picker-scene-meteor",
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationIterationCount: "infinite",
        animationTimingFunction: "linear",
        ...style,
      }}
    />
  );
}

/** 炊烟一缕：blur 细长圆角条，上升淡出。锚点/时长/延迟由 style + props 定。 */
export function SteamWisp({
  style,
  duration,
  delay,
}: {
  style?: CSSProperties;
  duration: number;
  delay: number;
}) {
  return (
    <div
      className="picker-scene-steam absolute"
      style={{
        width: 14,
        height: 60,
        borderRadius: 9999,
        background: "rgb(255 255 255 / 0.65)",
        filter: "blur(6px)",
        animationName: "picker-scene-steam",
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
        ...style,
      }}
    />
  );
}
