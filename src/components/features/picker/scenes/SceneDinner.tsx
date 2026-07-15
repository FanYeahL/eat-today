/**
 * SceneDinner / 都市夜（V3 底图接管 + V4 星/流星薄层，锚点走 art-meta）
 * ─────────────────────────────────────────────
 * 都市夜景全由 /scenes/dinner.webp 板绘底图承担（含亮窗/霓虹；Ken Burns 呼吸让画活）。
 * 旧 SVG 几何（双层天际线/小月牙/地平线 glow）已全数退役。
 *
 * 保留的动效薄层：Stars（画框顶部天空带）+ Meteor ×2（斜下坠）。V4 起纵向区间读
 * picker-art-meta 的 anchors.meteorBand（画框百分比），不再写死 top:6vh——底图铺满 art 区、
 * 桌面栏与视口解耦后，vh 坐标会飘，画框 % 坐标跟画走才稳（对齐容忍：只锚天空带大概区域）。
 * reduced-motion 下 meteor 隐藏（globals.css DEF-2b），星点静态保留。
 */

import { Stars, Meteor } from "./scene-parts";
import { artMeta } from "../picker-art-meta";

export default function SceneDinner() {
  // 星/流星只在画框顶部纯天空带内活动，band = [顶%, 底%]。
  const band = artMeta("dinner").anchors?.meteorBand ?? [0, 40];
  const [bandTop, bandBottom] = band;
  const span = bandBottom - bandTop;
  return (
    <div className="absolute inset-0">
      {/* 星野：三档 twinkle 错峰，容器 = 画框顶部天空带（Stars 自身 h 由 band 定）。 */}
      <Stars
        bandBottomPct={bandBottom}
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

      {/* 流星 ×2：低频、快速划过（≤1s）、斜下坠、方向不同，起手落在天空带上部（band 内）。
          35° 从左上向右下、145° 从右上向左下；两颗错峰（delay 0 / 6s）。 */}
      <Meteor
        style={{ left: "10%", top: `${bandTop + span * 0.15}%` }}
        duration={11}
        delay={0}
        angle={35}
      />
      <Meteor
        style={{ left: "85%", top: `${bandTop + span * 0.2}%` }}
        duration={11}
        delay={6}
        angle={145}
      />
    </div>
  );
}
