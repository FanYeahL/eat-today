/**
 * foreground-parts / 前景层零件（z-[5]，纯 presentational）
 * ─────────────────────────────────────────────
 * 前景件比场景剪影更近、更实、更大，从视窗边缘探入，可与标题/盘子交叠但压不住文字。
 * 全部只用 SVG / div + transform/opacity 动画类（picker-scene-*）。颜色走 --sil / --glow token。
 * reduced-motion 由全局 catch-all 停，静态造型完整保留。
 */

import { SteamWisp } from "./scene-parts";

/**
 * breakfast 近景大摊位（从左缘探入，对角线构图，唯一有近景棚顶的一幕）。
 * 占宽 ~44%、高 ~200px、底对齐场景视窗下缘：波浪雨棚（scalloped 4 个半圆）+ 撑杆 +
 * 台面两摞蒸笼（圆角矩形堆）+ 全强度炊烟 ×2（从近景蒸笼升起，飘过标题左下角）。
 */
export function StallForeground() {
  return (
    <div
      className="absolute left-0"
      style={{ width: "44%", maxWidth: 200, top: "calc(62vh - 200px)", height: 200 }}
    >
      <div className="relative h-full w-full">
        <svg
          viewBox="0 0 180 200"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* 撑杆（把棚撑起来，右侧一根斜杆连到台面） */}
          <rect x="150" y="70" width="5" height="120" fill="rgb(var(--sil) / 0.85)" />
          {/* 雨棚顶板 */}
          <path d="M-10 70 L160 70 L160 84 L-10 84 Z" fill="rgb(var(--sil) / 0.85)" />
          {/* 波浪雨棚边（scalloped：4 个下垂半圆） */}
          <path
            d="M-10 84
               Q4 104 30 84
               Q56 104 82 84
               Q108 104 134 84
               Q150 96 160 84
               L160 84 L-10 84 Z"
            fill="rgb(var(--sil) / 0.85)"
          />
          {/* 台面（横板） */}
          <rect x="-10" y="150" width="170" height="10" fill="rgb(var(--sil) / 0.85)" />
          {/* 台面支腿 */}
          <rect x="6" y="160" width="6" height="40" fill="rgb(var(--sil) / 0.85)" />
          <rect x="120" y="160" width="6" height="40" fill="rgb(var(--sil) / 0.85)" />
          {/* 蒸笼堆 1（左，3 层圆角矩形） */}
          <rect x="14" y="132" width="42" height="8" rx="3" fill="rgb(var(--sil) / 0.85)" />
          <rect x="16" y="123" width="38" height="9" rx="3" fill="rgb(var(--sil) / 0.85)" />
          <rect x="18" y="114" width="34" height="9" rx="3" fill="rgb(var(--sil) / 0.85)" />
          {/* 蒸笼堆 2（右，2 层） */}
          <rect x="78" y="134" width="40" height="8" rx="3" fill="rgb(var(--sil) / 0.85)" />
          <rect x="80" y="125" width="36" height="9" rx="3" fill="rgb(var(--sil) / 0.85)" />
        </svg>

        {/* 全强度炊烟 ×2：从两摞蒸笼顶升起（前景层在文字下，飘过标题左下角不挡字） */}
        <SteamWisp style={{ left: 26, top: 96 }} duration={8} delay={0} />
        <SteamWisp style={{ left: 92, top: 108 }} duration={11} delay={-5} />
      </div>
    </div>
  );
}

/**
 * tea 近景树冠（从右缘探入，逆光，三层景深里最近那层）。
 * 一团 3–4 圆叠成的树冠 + 一根斜枝，占右上角 ~120px，sil/0.8 近实；
 * 树冠开 2–3 个圆洞让落日光透出（洞是天色，不是剪影）。
 */
export function TreeCanopy() {
  return (
    <div className="absolute right-0 top-0" style={{ width: 140, height: 160 }}>
      <svg viewBox="0 0 140 160" className="absolute inset-0 h-full w-full">
        <defs>
          {/* 树冠开洞：用 mask 挖圆洞露出背后落日光 */}
          <mask id="picker-tea-canopy-holes">
            <rect x="0" y="0" width="140" height="160" fill="white" />
            <circle cx="70" cy="44" r="7" fill="black" />
            <circle cx="96" cy="58" r="5" fill="black" />
            <circle cx="56" cy="66" r="4" fill="black" />
          </mask>
        </defs>
        {/* 斜枝：从右缘伸入 */}
        <path
          d="M140 96 Q104 86 74 58"
          fill="none"
          stroke="rgb(var(--sil) / 0.8)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 树冠：3–4 圆叠成一团，开洞透光 */}
        <g fill="rgb(var(--sil) / 0.8)" mask="url(#picker-tea-canopy-holes)">
          <circle cx="96" cy="40" r="34" />
          <circle cx="64" cy="56" r="30" />
          <circle cx="116" cy="66" r="26" />
          <circle cx="88" cy="74" r="24" />
        </g>
      </svg>
    </div>
  );
}
