/**
 * scene-parts / 场景共享零件（纯 presentational，颜色走 token）
 * ─────────────────────────────────────────────
 * 场景舞台的可复用积木：光源（太阳/月亮/放射光芒）、粒子（星/尘埃/流星/炊烟/Zzz）、
 * 剪影容器、云、飞鸟、黑猫。全部只用 SVG / div + transform/opacity 动画类（picker-scene-*，
 * 见 globals.css）。所有元素静止帧即完整可见（动画只是让它活），reduced-motion 由全局 catch-all 停。
 *
 * 约定：光源锚定视口顶 ≤18vh（top-[Nvh] 或 top-[Npx]），保证 result/shops 首卡盖住地平线时
 * 光源仍完整可见；场景层由 PickerScene 以 absolute inset-0 承载，这里的定位都相对该层。
 */

import type { CSSProperties } from "react";

/** 圆形光源盘（太阳/月亮）：实心盘 + 可选双层光晕。color 传 rgb 通道或 hex。 */
export function LightDisc({
  className,
  size,
  color,
  glow,
  style,
}: {
  className?: string;
  size: number;
  color: string;
  /** 光晕色（通常 --glow）；给了就画两层柔光晕。 */
  glow?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ position: "absolute", ...style }}>
      {glow && (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: size * 3.2,
              height: size * 3.2,
              transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glow} 0%, transparent 68%)`,
              opacity: 0.45,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: size * 2,
              height: size * 2,
              transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glow} 0%, transparent 72%)`,
              opacity: 0.35,
            }}
          />
        </>
      )}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: size,
          height: size,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: color,
        }}
      />
    </div>
  );
}

/** 放射光芒扇（tea 灵魂）：从一点放射的 N 条细长光条，整组极慢转 + 呼吸。 */
export function RayFan({
  className,
  count = 9,
  length = 320,
  color = "rgb(255 245 220 / 0.1)",
  style,
}: {
  className?: string;
  count?: number;
  length?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`picker-scene-rays ${className ?? ""}`}
      style={{ position: "absolute", width: 0, height: 0, ...style }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = -70 + (140 / (count - 1)) * i; // 扇形从左到右铺开
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 26,
              height: length,
              transformOrigin: "center bottom",
              transform: `rotate(${angle}deg)`,
              background: `linear-gradient(to top, ${color}, transparent 78%)`,
            }}
          />
        );
      })}
    </div>
  );
}

/** 星野：一层 div 里若干正圆小点，三档 twinkle 错峰。
 *  用 div + border-radius:50% 而非 SVG 缩放——SVG viewBox 铺满非等比容器会把圆点拉成椭圆。
 *  x/y 直接当百分比用（相对 38vh 星空带），点径 = 2r px（1–2px）。 */
export function Stars({
  points,
}: {
  points: { x: number; y: number; r: number; speed: "a" | "b" | "c" }[];
}) {
  return (
    <div className="absolute inset-x-0 top-0 h-[38vh]">
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

/** 扁平云：圆角块堆叠，极慢横移。 */
export function Cloud({
  style,
  duration,
  delay = 0,
}: {
  style?: CSSProperties;
  duration: number;
  delay?: number;
}) {
  return (
    <div
      className="picker-scene-cloud absolute"
      style={{
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        ...style,
      }}
    >
      <div
        style={{
          width: 90,
          height: 22,
          borderRadius: 9999,
          background: "rgb(255 255 255 / 0.5)",
        }}
      />
    </div>
  );
}

/** 飞鸟：一笔「︶」，横穿。 */
export function Bird({ style, delay = 0 }: { style?: CSSProperties; delay?: number }) {
  return (
    <svg
      className="picker-scene-bird absolute"
      viewBox="0 0 24 10"
      style={{ width: 24, height: 10, animationDelay: `${delay}s`, ...style }}
    >
      <path
        d="M2 8 Q7 2 12 7 Q17 2 22 8"
        fill="none"
        stroke="rgb(var(--sil) / 0.4)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 打盹黑猫（midnight 主角，蜷坐剪影）：呼吸 + 尾巴卷 + 耳朵抖，各挂独立 <g>。
 *  从屋顶搬到食物盘边打盹——「黑猫在旁边打盹」。
 *  fill 显式传入——深夜近黑天空上纯 --sil 看不见，用「月光下的暖黑剪影」色让猫读得出。 */
export function SleepingCat({
  style,
  fill = "#05070C",
}: {
  style?: CSSProperties;
  fill?: string;
}) {
  return (
    <svg viewBox="0 0 120 90" className="absolute" style={{ width: 104, ...style }}>
      {/* 身体：蜷坐团块（呼吸），描一圈极淡月光边让轮廓从深天空里浮出 */}
      <g
        className="picker-scene-cat-breathe"
        stroke="rgb(242 235 221 / 0.35)"
        strokeWidth="1"
      >
        <path d="M22 78 Q18 50 40 44 Q64 38 82 52 Q98 64 96 78 Z" fill={fill} />
        {/* 头：埋在前爪间的圆 */}
        <circle cx="42" cy="52" r="15" fill={fill} />
        {/* 耳朵（左，抖动） */}
        <path className="picker-scene-cat-ear" d="M30 42 L33 52 L38 45 Z" fill={fill} />
        {/* 耳朵（右） */}
        <path d="M46 41 L50 51 L54 44 Z" fill={fill} />
      </g>
      {/* 尾巴：绕到身侧（尾尖轻卷） */}
      <path
        className="picker-scene-cat-tail"
        d="M94 78 Q112 74 104 58"
        fill="none"
        stroke={fill}
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Zzz：2–3 个 z 错峰上浮渐隐（打盹符号）。 */
export function Zzz({ style }: { style?: CSSProperties }) {
  return (
    <div className="absolute" style={{ ...style }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="picker-scene-zzz absolute font-black"
          style={{
            left: i * 10,
            bottom: i * 6,
            fontSize: 12 + i * 4,
            color: "rgb(var(--c-ink) / 0.55)",
            animationDelay: `${i * 2}s`,
          }}
        >
          z
        </span>
      ))}
    </div>
  );
}

/**
 * 地平线剪影带容器：横贯场景视窗地平线，填 --sil。children 传具体剪影 SVG paths。
 * 默认 top ~30vh（在食物焦点后方一带，而非视口最底——否则被下半的筛选卡盖住）。
 * 用 top 定位（相对 PickerScene 的 inset-0 场景层），可用 topVh 覆盖。
 */
export function SilhouetteBand({
  children,
  className,
  opacity = 1,
  topVh = 30,
}: {
  children: React.ReactNode;
  className?: string;
  opacity?: number;
  topVh?: number;
}) {
  return (
    <div
      className={`absolute inset-x-0 ${className ?? ""}`}
      style={{ top: `${topVh}vh`, opacity }}
    >
      {children}
    </div>
  );
}
