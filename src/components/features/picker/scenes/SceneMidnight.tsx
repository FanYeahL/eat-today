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

      {/* 一条舒缓大弧线屋脊（构图签名：极简负空间——唯一单曲线的一幕）。猫已搬到盘边，
          弧线上只留烟囱一根（左 1/3）+ 亮窗一扇（右 1/3）。「安宁寂静」= 一条弧 + 一扇灯 + 一轮月。
          topVh 44：坐在食物焦点下方一带、meal tab 之上，避免被下半筛选卡盖住。 */}
      <SilhouetteBand topVh={44}>
        <div className="relative h-[120px] w-full">
          <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="h-full w-full">
            {/* 单条舒缓大弧：左侧起于较高处（56% 高≈y53），缓弧到右侧较低（70% 高≈y36），
                填满弧下负空间。烟囱：左 1/3 处一根小矩形从弧脊竖起。 */}
            <path
              fill="rgb(var(--sil))"
              d="M0 120 L0 60 Q140 30 240 44 Q330 56 400 40 L400 120 Z"
            />
            {/* 烟囱（左 1/3，从弧脊竖起） */}
            <rect x="120" y="30" width="12" height="20" fill="rgb(var(--sil))" />
            <rect x="117" y="27" width="18" height="5" fill="rgb(var(--sil))" />
          </svg>
          {/* 亮窗（右 1/3）：暖橙，极慢呼吸 */}
          <div
            className="picker-scene-window absolute"
            style={{
              left: "68%",
              top: 52,
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
