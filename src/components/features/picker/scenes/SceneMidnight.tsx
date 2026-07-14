/**
 * SceneMidnight / 深夜月（背景层）
 * ─────────────────────────────────────────────
 * 最暗天空、更少更慢的星 + 大柔满月（呼吸）+ 屋顶剪影（一扇窗亮暖橙，呼吸）。
 * 满月锚定顶 ~7vh，result/shops 首卡盖住地平线时月亮仍完整可见。
 * 黑猫主角已搬到食物盘边打盹（见 PickerFoodStage 的 SleepingCat）——屋顶少了主角，
 * 负空间感反而更「安宁寂静」。
 */

import { Stars, LightDisc, SilhouetteBand } from "./scene-parts";

export default function SceneMidnight() {
  return (
    <div className="absolute inset-0">
      {/* 少量慢星 */}
      <Stars
        points={[
          { x: 14, y: 10, r: 0.6, speed: "c" },
          { x: 30, y: 20, r: 0.5, speed: "c" },
          { x: 46, y: 8, r: 0.6, speed: "b" },
          { x: 62, y: 18, r: 0.5, speed: "c" },
          { x: 80, y: 12, r: 0.6, speed: "b" },
          { x: 90, y: 24, r: 0.5, speed: "c" },
        ]}
      />

      {/* 大柔满月：下移左移到 right 30% / top 12vh，避开右上角工具 chip 堆
          （原 right16%/top7vh 垫在 chip 底下，半透 chip 叠上去像 bug、月亮也被切） */}
      <div className="picker-scene-moon absolute" style={{ right: "30%", top: "12vh" }}>
        <LightDisc
          size={72}
          color="rgb(242 235 221 / 0.92)"
          glow="rgb(242 235 221 / 0.22)"
        />
      </div>

      {/* 屋顶剪影 + 一扇亮窗（深夜留的一盏灯）。猫已搬到盘边，屋顶只留一排静房 + 一扇灯。
          topVh 44：坐在食物焦点下方一带、meal tab 之上，避免被下半筛选卡盖住。 */}
      <SilhouetteBand topVh={44}>
        <div className="relative h-[120px] w-full">
          <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="h-full w-full">
            {/* 一排安静的坡顶矮房 */}
            <path
              fill="rgb(var(--sil))"
              d="M0 120 L0 84 L60 84 L90 60 L120 84 L200 84 L200 74 L260 74 L300 44 L340 74 L400 74 L400 120 Z"
            />
          </svg>
          {/* 亮窗：暖橙，极慢呼吸 */}
          <div
            className="picker-scene-window absolute"
            style={{
              left: "62%",
              top: 58,
              width: 12,
              height: 14,
              borderRadius: 2,
              background: "rgb(var(--glow) / 0.85)",
              boxShadow: "0 0 12px 2px rgb(var(--glow) / 0.5)",
            }}
          />
        </div>
      </SilhouetteBand>
    </div>
  );
}
