/**
 * SceneBreakfast / 清晨市集（V3：底图接管 + 炊烟薄层）
 * ─────────────────────────────────────────────
 * 太阳 / 飞鸟 / 旗串 / 摊位剪影——清晨市集全由 /scenes/breakfast.webp 板绘底图承担（含画里的
 * 蒸笼摊子；Ken Burns 55s 呼吸让静态画活）。旧 SVG 几何（LightDisc 晨光 + Bird ×2 + 旗串 +
 * 远景剪影带 + 前景 StallForeground）已全数退役——旗串会叠在按钮附近、摊位剪影会和底图重复。
 *
 * 唯一保留的动效薄层：炊烟 SteamWisp ×2（方案 §四），叠在底图「画面中段偏左」的蒸笼上方，
 * 让画里的蒸笼「冒起热气」。锚定 left 22–30% / top ~40vh（对齐容忍：不精确锚画中某物，
 * 只锚大概区域，底图 reroll 也不用改代码）。reduced-motion 下由 catch-all 停，画面完整。
 */

import { SteamWisp } from "./scene-parts";

export default function SceneBreakfast() {
  return (
    <div className="absolute inset-0">
      {/* 炊烟 ×2：对位底图中段偏左的蒸笼区（left 22–30% / top ~40vh 起），错峰上升淡出。 */}
      <SteamWisp style={{ left: "22%", top: "40vh" }} duration={8} delay={0} />
      <SteamWisp style={{ left: "29%", top: "42vh" }} duration={11} delay={-5} />
    </div>
  );
}
