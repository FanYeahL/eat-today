/**
 * PickerAtmosphere / 背景氛围层（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * 「删到高级」重构：删掉全部 MCM 有机几何贴纸（KidneyShape / Starburst / Boomerang /
 * AtomicOrbit）、桌面两侧补背景大形状、底部暗色带、全部环境循环动效。背景收敛为恰好三层，
 * 零 SVG、零动画——第一层视觉留给 hero 票据 / 食物 / CTA，背景只做安静的暖纸底。
 *
 * 三层（从下到上）：
 *   1. 暖米色径向纸底（warm beige，全幅铺底）
 *   2. 极淡纸质颗粒（picker-paper-grain，静态噪点，给印刷海报的纸感）
 *   3. 一处极轻暖光晕（hero 后一个大范围低透明 brand 径向，给页面一点温度层次，纯静态）
 * 全 aria-hidden、绝对定位、z-0，落在内容之下。
 */

export default function PickerAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* 1. 纸底：暖米色径向渐变（MCM warm beige）——全幅铺底 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% -10%, #fbf3e4 0%, #f3e6cd 46%, #ecdbbd 100%)",
        }}
      />
      {/* 2. 纸质颗粒：极淡噪点，给印刷海报的纸感——全幅 */}
      <div className="picker-paper-grain absolute inset-0" />
      {/* 3. 极轻暖光晕：hero 后一处大范围低透明 brand 径向，给一点温度层次（纯静态） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 12%, rgb(var(--c-brand) / 0.06), transparent 70%)",
        }}
      />
    </div>
  );
}
