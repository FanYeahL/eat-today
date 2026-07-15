/**
 * SceneBreakfast / 清晨市集（V3 底图接管 + V4 炊烟薄层，锚点走 art-meta）
 * ─────────────────────────────────────────────
 * 清晨市集全由 /scenes/breakfast.webp 板绘底图承担（含画里的蒸笼摊子；Ken Burns 呼吸让画活）。
 * 旧 SVG 几何（晨光/飞鸟/旗串/摊位剪影）已全数退役。
 *
 * 唯一保留的动效薄层：炊烟 SteamWisp ×2，叠在底图蒸笼上方让它「冒热气」。
 * V4 起锚点读 picker-art-meta 的 anchors.steam（画框百分比坐标），不再写死 top:40vh——
 * 底图铺满 art 区后 vh 坐标会飘，百分比坐标跟画框走才稳（对齐容忍：只锚大概区域）。
 * reduced-motion 下 steam 隐藏（见 globals.css DEF-2b），画面完整。
 */

import { SteamWisp } from "./scene-parts";
import { artMeta } from "../picker-art-meta";

export default function SceneBreakfast() {
  const steam = artMeta("breakfast").anchors?.steam ?? [];
  return (
    <div className="absolute inset-0">
      {/* 炊烟：对位底图蒸笼区（画框 % 坐标 + 各自 dur/delay，全来自 art-meta），错峰上升淡出。
          加第三缕只改档案，组件不动。 */}
      {steam.map((p, i) => (
        <SteamWisp
          key={i}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          duration={p.dur}
          delay={p.delay}
        />
      ))}
    </div>
  );
}
