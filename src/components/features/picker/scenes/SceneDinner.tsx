/**
 * SceneDinner / 都市夜 + 流星
 * ─────────────────────────────────────────────
 * 星（三档 twinkle）+ 天际线剪影（开亮窗，部分 flicker）+ 地平线橙暖 glow + 流星 ×2（低频快速划过）。
 * 「城市是活的」靠亮窗 flicker；光源（流星起点 + 地平线 glow）锚定顶部带内。
 */

import { Stars, Meteor, SilhouetteBand } from "./scene-parts";

/** 天际线楼群 + 亮窗（部分挂 flicker）。 */
function Skyline() {
  // 楼:x, 宽, 高（从地平线往上）
  const buildings = [
    { x: 8, w: 34, h: 70 },
    { x: 46, w: 28, h: 96 },
    { x: 78, w: 40, h: 58 },
    { x: 122, w: 30, h: 110 }, // 塔
    { x: 156, w: 36, h: 76 },
    { x: 196, w: 26, h: 92 },
    { x: 226, w: 44, h: 64 },
    { x: 274, w: 30, h: 100 },
    { x: 308, w: 38, h: 72 },
    { x: 350, w: 42, h: 88 },
  ];
  let winKey = 0;
  return (
    <svg viewBox="0 0 400 110" preserveAspectRatio="none" className="h-[110px] w-full">
      {buildings.map((b, bi) => (
        <g key={bi}>
          <rect x={b.x} y={110 - b.h} width={b.w} height={b.h} fill="rgb(var(--sil))" />
          {/* 亮窗网格 */}
          {Array.from({ length: Math.floor(b.h / 14) }).map((_, ry) =>
            Array.from({ length: Math.floor(b.w / 11) }).map((_, rx) => {
              const k = winKey++;
              const lit = k % 3 === 0; // 约 1/3 亮
              if (!lit) return null;
              const flick = k % 7 === 0; // 少量 flicker
              return (
                <rect
                  key={`${ry}-${rx}`}
                  x={b.x + 4 + rx * 11}
                  y={110 - b.h + 8 + ry * 14}
                  width={3}
                  height={4}
                  fill="#FFD9A0"
                  className={flick ? "picker-scene-flicker" : undefined}
                  style={flick ? { animationDelay: `${(k % 6) * 1.3}s` } : undefined}
                  opacity={flick ? undefined : 0.85}
                />
              );
            }),
          )}
        </g>
      ))}
    </svg>
  );
}

export default function SceneDinner() {
  return (
    <div className="absolute inset-0">
      {/* 星野：三档 twinkle 错峰 */}
      <Stars
        points={[
          { x: 10, y: 8, r: 0.6, speed: "a" },
          { x: 24, y: 16, r: 0.5, speed: "b" },
          { x: 33, y: 6, r: 0.7, speed: "c" },
          { x: 44, y: 20, r: 0.5, speed: "a" },
          { x: 56, y: 10, r: 0.6, speed: "b" },
          { x: 63, y: 22, r: 0.5, speed: "c" },
          { x: 72, y: 8, r: 0.7, speed: "a" },
          { x: 82, y: 18, r: 0.5, speed: "b" },
          { x: 90, y: 12, r: 0.6, speed: "c" },
          { x: 16, y: 26, r: 0.5, speed: "b" },
          { x: 50, y: 30, r: 0.5, speed: "c" },
          { x: 78, y: 28, r: 0.5, speed: "a" },
        ]}
      />

      {/* 小月牙（高处，锚定顶 ~6vh） */}
      <div
        className="absolute"
        style={{
          right: "14%",
          top: "6vh",
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "#F2EBDD",
          opacity: 0.85,
          boxShadow: "8px 3px 0 -3px rgb(var(--sky-0)) inset",
        }}
      />

      {/* 流星 ×2：低频、快速划过（≤1s）、斜下坠、方向不同。
          35° 从左上向右下、145° 从右上向左下；两颗错峰（delay 0 / 6s）。 */}
      <Meteor style={{ left: "10%", top: "6vh" }} duration={11} delay={0} angle={35} />
      <Meteor style={{ left: "85%", top: "8vh" }} duration={11} delay={6} angle={145} />

      {/* 地平线橙暖 glow（天际线后，与 skyline 带对齐在 ~46vh） */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "42vh",
          height: 140,
          background:
            "linear-gradient(to top, rgb(var(--glow) / 0.28), transparent 92%)",
        }}
      />

      {/* 天际线剪影 + 亮窗（topVh 46：食物焦点下方、meal tab 之上，避免被筛选卡盖住） */}
      <SilhouetteBand topVh={46}>
        <Skyline />
      </SilhouetteBand>
    </div>
  );
}
