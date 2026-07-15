/**
 * SceneDinner / 都市夜（V3：底图接管 + 星/流星薄层）
 * ─────────────────────────────────────────────
 * 天际线楼群 / 亮窗 / 霓虹招牌 / 小月牙 / 地平线橙暖——都市夜景全由 /scenes/dinner.webp 板绘底图
 * 承担（含画里的亮窗与霓虹；Ken Burns 55s 呼吸让静态画活）。旧 SVG 几何（SkylineFar/SkylineNear
 * 双层天际线 + 小月牙 + 地平线 glow）已全数退役——会和底图叠成「双楼群 / 双月亮」。
 *
 * 保留的动效薄层（方案 §四）：Stars（上 1/4 天空带）+ Meteor ×2（斜下坠），只在 0–20vh 天空带、
 * 不与画里的楼冲突。对齐容忍：星/流星只锚「天空带」大概区域，底图 reroll 不用改代码。
 * reduced-motion 下由 catch-all 停，静止底图完整。
 */

import { Stars, Meteor } from "./scene-parts";

export default function SceneDinner() {
  return (
    <div className="absolute inset-0">
      {/* 星野：三档 twinkle 错峰，锚在上 1/4 天空带（Stars 自身容器 h-[38vh]）。 */}
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

      {/* 流星 ×2：低频、快速划过（≤1s）、斜下坠、方向不同，只在 0–8vh 天空带起手。
          35° 从左上向右下、145° 从右上向左下；两颗错峰（delay 0 / 6s）。 */}
      <Meteor style={{ left: "10%", top: "6vh" }} duration={11} delay={0} angle={35} />
      <Meteor style={{ left: "85%", top: "8vh" }} duration={11} delay={6} angle={145} />
    </div>
  );
}
