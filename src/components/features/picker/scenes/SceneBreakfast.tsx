/**
 * SceneBreakfast / 清晨市集（热闹但不吵）
 * ─────────────────────────────────────────────
 * 低位大太阳光晕 + 市集摊位剪影（雨棚/三角旗/灯杆）+ 炊烟 ×3（锚在蒸笼位上升）+ 三角旗轻摆 + 飞鸟。
 * 太阳锚定顶 ~15vh，贴地平线的晨光；炊烟从摊位蒸笼位起（不悬空），任意时刻 ≥1 条可见。
 */

import { LightDisc, SteamWisp, Bird, SilhouetteBand } from "./scene-parts";

export default function SceneBreakfast() {
  return (
    <div className="absolute inset-0">
      {/* 晨光太阳：低位大光晕 + 小暖芯，锚顶 ~15vh、水平 74% */}
      <LightDisc
        size={54}
        color="rgb(255 231 176 / 0.9)"
        glow="rgb(255 193 99 / 0.9)"
        style={{ left: "74%", top: "15vh" }}
      />

      {/* 飞鸟 ×2：天空上部横穿 */}
      <Bird style={{ top: "8vh", left: 0 }} />
      <Bird style={{ top: "12vh", left: 0 }} delay={-9} />

      {/* 市集剪影 + 炊烟 + 三角旗（topVh 46：食物焦点下方、meal tab 之上；炊烟往上飘进焦点区） */}
      <SilhouetteBand opacity={0.2} topVh={46}>
        <div className="relative h-[92px] w-full">
          <svg viewBox="0 0 400 92" preserveAspectRatio="none" className="h-full w-full">
            {/* 地面 */}
            <rect x="0" y="82" width="400" height="10" fill="rgb(var(--sil))" />
            {/* 摊位 1（带雨棚 + 蒸笼） */}
            <path fill="rgb(var(--sil))" d="M40 82 L40 52 L120 52 L120 82 Z" />
            <path fill="rgb(var(--sil))" d="M32 52 L128 52 L118 40 L42 40 Z" />
            {/* 蒸笼堆（炊烟从这里起） */}
            <rect x="62" y="60" width="26" height="22" fill="rgb(var(--sil))" />
            {/* 摊位 2 */}
            <path fill="rgb(var(--sil))" d="M230 82 L230 56 L320 56 L320 82 Z" />
            <path fill="rgb(var(--sil))" d="M222 56 L328 56 L318 44 L232 44 Z" />
            <rect x="256" y="62" width="24" height="20" fill="rgb(var(--sil))" />
            {/* 灯杆 */}
            <rect x="180" y="34" width="4" height="48" fill="rgb(var(--sil))" />
            <circle cx="182" cy="32" r="5" fill="rgb(var(--glow))" opacity="0.5" />
          </svg>

          {/* 三角旗串（灯杆↔摊位），轻摆 */}
          <svg
            viewBox="0 0 160 20"
            className="picker-scene-flag absolute"
            style={{ left: "34%", top: 6, width: 160 }}
          >
            <path d="M0 2 L160 2" stroke="rgb(var(--sil))" strokeWidth="1" />
            {Array.from({ length: 8 }).map((_, i) => (
              <path
                key={i}
                d={`M${i * 20} 2 L${i * 20 + 16} 2 L${i * 20 + 8} 14 Z`}
                fill="rgb(var(--sil))"
                opacity={0.9}
              />
            ))}
          </svg>

          {/* 炊烟 ×3：锚在蒸笼位（摊位 1 约 18%、摊位 2 约 66%），错峰上升 */}
          <SteamWisp style={{ left: "17%", bottom: 30 }} duration={9} delay={0} />
          <SteamWisp style={{ left: "20%", bottom: 30 }} duration={11} delay={-4} />
          <SteamWisp style={{ left: "65%", bottom: 26 }} duration={10} delay={-7} />
        </div>
      </SilhouetteBand>
    </div>
  );
}
