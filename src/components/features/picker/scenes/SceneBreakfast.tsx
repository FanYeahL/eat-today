/**
 * SceneBreakfast / 清晨市集（构图签名：近景大摊位从左缘探入，对角线构图）
 * ─────────────────────────────────────────────
 * 低位大太阳光晕 + 飞鸟 + 远景简化剪影带（远处 1 小摊 + 灯杆，α0.2）+ 横过天空的旗串（轻摆）。
 * 「热闹」主要由前景层的近景大摊位（StallForeground：波浪雨棚 + 蒸笼 + 全强度炊烟）扛，
 * 见 foreground-parts.tsx。这里只留远景衬托，不再放近景蒸笼/炊烟（避免与前景重复）。
 * 太阳锚定顶 ~15vh，贴地平线的晨光。
 */

import { LightDisc, Bird, SilhouetteBand } from "./scene-parts";

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

      {/* 旗串横过天空（topVh ~12、偏右）：轻摆。「热闹」三件套之一（另两件在前景近景摊位）。 */}
      <SilhouetteBand topVh={12}>
        <svg
          viewBox="0 0 200 20"
          className="picker-scene-flag absolute"
          style={{ left: "42%", width: 200 }}
        >
          <path d="M0 2 L200 2" stroke="rgb(var(--sil) / 0.45)" strokeWidth="1" />
          {Array.from({ length: 10 }).map((_, i) => (
            <path
              key={i}
              d={`M${i * 20} 2 L${i * 20 + 16} 2 L${i * 20 + 8} 14 Z`}
              fill="rgb(var(--sil) / 0.45)"
            />
          ))}
        </svg>
      </SilhouetteBand>

      {/* 远景剪影带（简化：远处 1 小摊 + 灯杆，α0.2）——近景大摊位已迁到前景层。 */}
      <SilhouetteBand topVh={46}>
        <div className="relative h-[92px] w-full">
          <svg viewBox="0 0 400 92" preserveAspectRatio="none" className="h-full w-full">
            {/* 地面 */}
            <rect x="0" y="82" width="400" height="10" fill="rgb(var(--sil) / 0.2)" />
            {/* 远处 1 小摊（带雨棚） */}
            <path fill="rgb(var(--sil) / 0.2)" d="M250 82 L250 58 L330 58 L330 82 Z" />
            <path fill="rgb(var(--sil) / 0.2)" d="M242 58 L338 58 L328 46 L252 46 Z" />
            {/* 灯杆 + 灯球（暖光小点，0.4 读作「点着的灯」而不刺眼） */}
            <rect x="200" y="40" width="4" height="42" fill="rgb(var(--sil) / 0.2)" />
            <circle cx="202" cy="38" r="5" fill="rgb(var(--glow))" opacity="0.4" />
          </svg>
        </div>
      </SilhouetteBand>
    </div>
  );
}
