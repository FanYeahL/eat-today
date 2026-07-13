/**
 * PickerAtmosphere / 饭点氛围背景层（/picker，所有 phase 背后渲染一次）
 * ─────────────────────────────────────────────
 * 按 meal 时段换气质：底色走 data-meal token（见 globals.css 的 .picker-theme [data-meal]），
 * 再叠一层「恰好一个」的 ambient 动效（steam/sun/sunset/city/midnight）。氛围很淡很慢、
 * 落在内容之下（z-0、aria-hidden、pointer-events-none），不抢主内容。
 *
 * 选层不写 if 链：用 mealScene(meal).ambient 从 AMBIENT map 取对应子组件。
 * 每个 ambient 只 transform/opacity、慢+轻，reduced-motion 全关（见 globals.css）。
 * 每 meal 最多一个背景动效——这条硬线（ambient 若显廉价则降级为静态光感，不补元素）。
 */

import type { MealType } from "@/types/food";
import { mealScene, type AmbientType } from "./picker-meal-scenes";

/** breakfast：2–3 条极淡蒸汽缓慢上升（窄竖条 blur，错峰）。非铺满烟。 */
function Steam() {
  return (
    <>
      {[
        { left: "42%", delay: "0s", h: "9rem" },
        { left: "50%", delay: "-3s", h: "10rem" },
        { left: "58%", delay: "-6s", h: "8rem" },
      ].map((w, i) => (
        <div
          key={i}
          className="picker-amb-steam absolute w-5 rounded-full bg-white/45 blur-[10px]"
          style={{ left: w.left, top: "42%", height: w.h, animationDelay: w.delay }}
        />
      ))}
    </>
  );
}

/** lunch：一条极轻斜向暖光带，near-static，只 opacity 轻呼吸。不过曝。 */
function Sun() {
  return (
    <div
      className="picker-amb-sun absolute inset-0"
      style={{
        background:
          "linear-gradient(122deg, transparent 30%, rgb(var(--c-accent) / 0.16) 52%, transparent 70%)",
      }}
    />
  );
}

/** tea：右上/侧后暖光晕缓慢位移。不粉红网红。 */
function Sunset() {
  return (
    <div
      className="picker-amb-sunset absolute inset-0"
      style={{
        background:
          "radial-gradient(52% 44% at 82% 14%, rgb(var(--c-brand) / 0.18), transparent 72%)",
      }}
    />
  );
}

/** dinner：极少量城市光点极慢明灭 + 一条低频流星（12s 一次划过）。非游戏特效。 */
function City() {
  const dots = [
    { l: "18%", t: "22%", d: "0s" },
    { l: "30%", t: "16%", d: "-2s" },
    { l: "44%", t: "26%", d: "-4s" },
    { l: "62%", t: "18%", d: "-1s" },
    { l: "74%", t: "28%", d: "-3s" },
    { l: "86%", t: "20%", d: "-5s" },
    { l: "24%", t: "34%", d: "-2.5s" },
    { l: "68%", t: "36%", d: "-4.5s" },
  ];
  return (
    <>
      {dots.map((p, i) => (
        <div
          key={i}
          className="picker-amb-citydot absolute h-[2px] w-[2px] rounded-full bg-white/70"
          style={{ left: p.l, top: p.t, animationDelay: p.d }}
        />
      ))}
      {/* 流星：细斜线，低频划过 */}
      <div
        className="picker-amb-meteor absolute h-px w-24 -rotate-[20deg]"
        style={{
          left: "12%",
          top: "12%",
          background:
            "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.8))",
        }}
      />
    </>
  );
}

/** midnight：角落一只极简黑猫剪影（<72px、低 opacity、贴角），极慢呼吸 + 尾巴偶尔轻摆。 */
function MidnightCat() {
  return (
    <div className="absolute bottom-6 right-5 h-14 w-14 opacity-35">
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
        {/* 身体 + 头（打盹蜷坐剪影），极慢呼吸 */}
        <g className="picker-amb-catbreathe" fill="rgb(var(--c-ink) / 0.9)">
          <ellipse cx="34" cy="52" rx="22" ry="10" />
          <circle cx="20" cy="40" r="12" />
          <path d="M11 32 L15 40 L19 33 Z" />
          <path d="M22 31 L26 40 L29 33 Z" />
        </g>
        {/* 尾巴，偶尔轻摆 */}
        <path
          className="picker-amb-tail"
          d="M54 52 Q62 48 58 40"
          fill="none"
          stroke="rgb(var(--c-ink) / 0.9)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/** ambient 选层 map（不写 if 链）。 */
const AMBIENT: Record<AmbientType, () => JSX.Element> = {
  steam: Steam,
  sun: Sun,
  sunset: Sunset,
  city: City,
  midnight: MidnightCat,
};

export default function PickerAtmosphere({ meal }: { meal: MealType }) {
  const scene = mealScene(meal);
  const Ambient = AMBIENT[scene.ambient];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* 底色：走 data-meal token（base→surface 的柔和径向），随时段换气质 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% -10%, rgb(var(--c-surface)) 0%, rgb(var(--c-base)) 55%, rgb(var(--c-base)) 100%)",
        }}
      />
      {/* 一处极轻暖光晕：hero 后大范围低透明 brand 径向（随 meal accent 变） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 12%, rgb(var(--c-brand) / 0.08), transparent 70%)",
        }}
      />
      {/* 该时段的唯一 ambient 层 */}
      <Ambient />
    </div>
  );
}
