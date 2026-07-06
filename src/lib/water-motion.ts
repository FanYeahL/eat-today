/**
 * 水占动效调参源（单一可信源）
 * ─────────────────────────────────────────────
 * 把「落水阻尼 / 涟漪扩散 / 洇湿显影」三段手感全集中在这里，
 * 校对时只改这个文件的数值，组件不用动。所有动画只跑 transform / opacity / filter，
 * 不碰 layout（width/height/top 一律不 animate），保证 60fps 不卡顿。
 *
 * 时长以「秒」为单位（Framer Motion 习惯）。三段时长之和即「投签→显影完成」的总节奏。
 */

import type { Transition, Variants } from "framer-motion";

/** 三段节奏的时长锚点，演示页据此排程（与 hook 的 timer 对齐） */
export const TIMING = {
  /** 签纸从空中直坠到水面（轻柔慢坠） */
  drop: 1.4,
  /** 触水接触点 = 落地同刻：纸触水那一毫秒起涟漪（触水即荡） */
  contact: 1.4,
  /** 菜名/文案洇湿显影 */
  develop: 0.95,
  /** 落水后、显影前的微停顿（让涟漪先起一拍） */
  beat: 0.2,
} as const;

/**
 * 签纸落水变体。
 * idle 时 y=-52（屏幕中上方，完整可见、与顶部留足呼吸空间，不再被截断）。
 * - aloft：初始位姿。
 * - hover：微风悬浮微动——Y 轴 ±4px 起伏 + ±1° 极慢交替晃动，
 *   周期 4.5s、easeInOut，营造「被微风托住」的轻盈治愈感。
 * - fall(restAngle)：纯净直接的单向下坠（1.4s），无回弹无抖动，触水即静止。
 */
const IDLE_Y = -52;

export const slipVariants: Variants = {
  aloft: { y: IDLE_Y, rotate: -1, scale: 1, opacity: 1 },
  hover: {
    y: [IDLE_Y - 4, IDLE_Y + 4, IDLE_Y - 4],
    rotate: [-1, 1, -1],
    transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
  },
  fall: (restAngle: number = -3) => ({
    // 纯下坠：单向从 IDLE_Y 落到水面 0，触水即平滑静止定格，零回弹零抖动。
    y: 0,
    rotate: restAngle,
    opacity: 0.92,
    transition: {
      ease: [0.16, 1, 0.3, 1], // 无 overshoot 减速曲线，丝滑到底
      duration: 1.4,
      opacity: { duration: 0.95, ease: "easeOut" },
    },
  }),
};

/**
 * 涟漪改为纯 CSS keyframes（见 globals.css 的 pond-ripple），更细腻可控。
 * 此处不再导出涟漪/水花 variants。
 */

/** 点击任意处的「微涟漪」：更小更快，纯氛围 */
export const tapRippleTransition: Transition = {
  duration: 0.9,
  ease: [0.2, 0.6, 0.3, 1],
};

/**
 * 干饭天机显影：由模糊到清晰 + 透明度浮现，像水汽渗进纸里。
 * 只动 opacity + filter(blur)，不再动 scale —— scale 会让整块字像一层浮层从纸面「升起」，
 * 产生与纸游离的悬浮感；去掉后字是直接「洇」在纸上，咬合更自然。
 * hidden 设为瞬时（duration 0）：内容隐藏那刻立即清空，配合换签期间换 pick，
 * 不会在淡出途中露出下一道菜（消除「换一道闪一下新菜」）。
 */
export const developVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(8px)",
    transition: { duration: 0 },
  },
  shown: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: TIMING.develop, ease: "easeOut" },
  },
};

/** 水底漂流卡：缓缓上浮入场 + 常驻微浮动 */
export const driftCardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  shown: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" },
  }),
  float: (i: number) => ({
    y: [0, -8, 0],
    transition: {
      duration: 3.6 + i * 0.4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  }),
};
