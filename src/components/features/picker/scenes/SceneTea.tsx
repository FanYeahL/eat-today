/**
 * SceneTea / 黄昏夕阳（点名要「光线感」）
 * ─────────────────────────────────────────────
 * 半沉落日盘（底部被地平线裁）+ 放射光芒（场景灵魂）+ 染色横云 + 屋顶剪影（逆光）。
 * 光源锚定顶 ≤18vh，保证 result/shops 首卡盖住地平线时落日 + 光芒仍完整可见。
 */

import { LightDisc, RayFan, Cloud, SilhouetteBand } from "./scene-parts";

export default function SceneTea() {
  return (
    <div className="absolute inset-0">
      {/* 放射光芒：从落日位置铺开的扇形光条，整组极慢转 + 呼吸 */}
      <RayFan
        count={9}
        length={360}
        color="rgb(255 214 150 / 0.12)"
        style={{ left: "72%", top: "16vh" }}
      />

      {/* 落日盘：大、低、半沉（底部 1/3 被地平线裁），锚定顶 ~14vh */}
      <LightDisc
        size={92}
        color="rgb(255 184 119 / 0.92)"
        glow="rgb(255 140 66 / 0.9)"
        style={{ left: "72%", top: "14vh" }}
      />

      {/* 染色横云 ×3：橙粉，极慢横移 */}
      <Cloud duration={130} style={{ top: "9vh", left: 0 }} />
      <Cloud duration={165} delay={-40} style={{ top: "20vh", left: 0 }} />
      <Cloud duration={150} delay={-80} style={{ top: "27vh", left: 0 }} />

      {/* 屋顶/树剪影带（逆光：亮天空 + 暗剪影；topVh 44 在食物焦点下方一带） */}
      <SilhouetteBand opacity={0.35} topVh={44}>
        <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="h-[90px] w-full">
          <path
            fill="rgb(var(--sil))"
            d="M0 90 L0 58 L40 58 L52 40 L64 58 L120 58 L120 46 L150 46 L150 58 L210 58 L228 34 L246 58 L300 58 L300 50 L340 50 L352 38 L364 50 L400 50 L400 90 Z"
          />
          {/* 一棵树剪影 */}
          <circle cx="330" cy="44" r="14" fill="rgb(var(--sil))" />
        </svg>
      </SilhouetteBand>
    </div>
  );
}
