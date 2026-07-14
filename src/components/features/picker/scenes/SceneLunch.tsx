/**
 * SceneLunch / 正午正能量（最简单，通透空旷）
 * ─────────────────────────────────────────────
 * 顶部偏右实体太阳（圆盘 + 12 道短光芒，极慢自转）+ 光柱 ×2（opacity 呼吸）+ 尘埃微粒 + 白云 ×2。
 * 剪影无/极浅。太阳锚定顶 ~10vh，正能量 = 看得见太阳在转。
 */

import { Cloud } from "./scene-parts";

/** 实体太阳：圆盘 + 12 道短光芒，整组极慢自转。 */
function SpinningSun() {
  return (
    <div
      className="absolute"
      style={{ right: "16%", top: "10vh", width: 120, height: 120 }}
    >
      {/* 光晕 */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: "50%",
          background: "radial-gradient(circle, rgb(255 211 77 / 0.35), transparent 66%)",
          transform: "scale(1.8)",
        }}
      />
      {/* 光芒组（自转） */}
      <svg
        viewBox="0 0 120 120"
        className="picker-scene-sunspin absolute inset-0 h-full w-full"
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 60 + Math.cos(a) * 42;
          const y1 = 60 + Math.sin(a) * 42;
          const x2 = 60 + Math.cos(a) * 54;
          const y2 = 60 + Math.sin(a) * 54;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgb(255 211 77 / 0.85)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {/* 圆盘 */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: 62,
          height: 62,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "rgb(255 211 77 / 0.9)",
        }}
      />
    </div>
  );
}

export default function SceneLunch() {
  return (
    <div className="absolute inset-0">
      <SpinningSun />

      {/* 光柱 ×2：从太阳斜向下的宽光带，opacity 呼吸 + 轻移，错峰 */}
      <div
        className="picker-scene-shaft absolute"
        style={{
          right: "10%",
          top: 0,
          width: 120,
          height: "48vh",
          transform: "rotate(14deg)",
          transformOrigin: "top center",
          background: "linear-gradient(to bottom, rgb(255 240 200 / 0.18), transparent 82%)",
        }}
      />
      <div
        className="picker-scene-shaft absolute"
        style={{
          right: "24%",
          top: 0,
          width: 90,
          height: "42vh",
          transform: "rotate(10deg)",
          transformOrigin: "top center",
          background: "linear-gradient(to bottom, rgb(255 240 200 / 0.12), transparent 82%)",
          animationDelay: "-10s",
        }}
      />

      {/* 尘埃微粒 8：光柱区缓慢上浮闪烁 */}
      {[
        { l: "70%", t: "20vh", d: "0s" },
        { l: "74%", t: "28vh", d: "-3s" },
        { l: "78%", t: "16vh", d: "-6s" },
        { l: "82%", t: "24vh", d: "-9s" },
        { l: "68%", t: "32vh", d: "-2s" },
        { l: "86%", t: "30vh", d: "-5s" },
        { l: "72%", t: "12vh", d: "-8s" },
        { l: "80%", t: "34vh", d: "-11s" },
      ].map((p, i) => (
        <div
          key={i}
          className="picker-scene-mote absolute rounded-full"
          style={{
            left: p.l,
            top: p.t,
            width: 3,
            height: 3,
            background: "rgb(255 240 200 / 0.9)",
            animationDuration: `${12 + (i % 4) * 2}s`,
            animationDelay: p.d,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
            animationName: "picker-scene-mote",
          }}
        />
      ))}

      {/* 白云 ×2：极慢横移 */}
      <Cloud duration={110} style={{ top: "8vh", left: 0 }} />
      <Cloud duration={140} delay={-50} style={{ top: "18vh", left: 0 }} />
    </div>
  );
}
