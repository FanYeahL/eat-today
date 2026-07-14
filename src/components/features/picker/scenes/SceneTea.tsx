/**
 * SceneTea / 黄昏夕阳（构图签名：三层景深，层层退远——唯一多层景深的一幕）
 * ─────────────────────────────────────────────
 * 半沉落日盘（下缘被云堤裁）+ 放射光芒（场景灵魂）+ 染色横云 + 三层景深剪影：
 *   ① 远山缓坡（sil/0.15，topVh 40）② 中景屋顶带（sil/0.35，topVh 44）
 *   ③ 近景树冠从右缘探入（前景层 z-[5]，见 foreground-parts 的 TreeCanopy）。
 * 层层退远的紫→橙渐变 + 逆光树冠，承担「太阳下山的光线感」验收主力。
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

      {/* 落日盘：大、低，锚定顶 ~14vh */}
      <LightDisc
        size={92}
        color="rgb(255 184 119 / 0.92)"
        glow="rgb(255 140 66 / 0.9)"
        style={{ left: "72%", top: "14vh" }}
      />

      {/* 云堤：裁住落日下缘约 1/3，让「悬在半空的午后太阳」读作「沉入云海的夕阳」。
          同天色渐变（上透明→sky-1→sky-2），在日盘之上、极慢横移 ±6px 像云不像色块。 */}
      <div
        className="picker-scene-cloudbank absolute"
        style={{
          left: "calc(72% - 110px)",
          top: "calc(14vh + 14px)",
          width: 220,
          height: 48,
          borderRadius: 9999,
          background:
            "linear-gradient(180deg, rgb(var(--sky-1) / 0) 0%, rgb(var(--sky-1)) 45%, rgb(var(--sky-2)) 100%)",
        }}
      />

      {/* 染色横云 ×3：橙粉，极慢横移 */}
      <Cloud duration={130} style={{ top: "9vh", left: 0 }} />
      <Cloud duration={165} delay={-40} style={{ top: "20vh", left: 0 }} />
      <Cloud duration={150} delay={-80} style={{ top: "27vh", left: 0 }} />

      {/* ① 远山缓坡（最远层，最淡）：一条 2–3 起伏的平缓曲线，sil/0.15、topVh 40。 */}
      <SilhouetteBand topVh={40}>
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="h-[60px] w-full">
          <path
            fill="rgb(var(--sil) / 0.15)"
            d="M0 60 L0 44 Q60 28 130 40 Q210 54 280 34 Q340 20 400 36 L400 60 Z"
          />
        </svg>
      </SilhouetteBand>

      {/* ② 中景屋顶带（逆光暗剪影，比远山实）：sil/0.35、topVh 44。 */}
      <SilhouetteBand topVh={44}>
        <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="h-[90px] w-full">
          <path
            fill="rgb(var(--sil) / 0.35)"
            d="M0 90 L0 58 L40 58 L52 40 L64 58 L120 58 L120 46 L150 46 L150 58 L210 58 L228 34 L246 58 L300 58 L300 50 L340 50 L352 38 L364 50 L400 50 L400 90 Z"
          />
        </svg>
      </SilhouetteBand>

      {/* ③ 近景树冠从右缘探入 → 已迁到前景层 z-[5]（foreground-parts 的 TreeCanopy），
          枝叶间开圆洞透落日光，是三层景深里最近、最实的一层。 */}
    </div>
  );
}
