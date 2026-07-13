/**
 * PickerAtmosphere / 背景氛围层（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * clean food utility 重构：背景收敛为干净暖白，不发黄旧、不铺纸纹。第一层视觉留给
 * hero 标题 / 食物焦点 / CTA，背景只做安静的暖白底 + 一处极轻暖光晕。
 *
 * 两层（从下到上）：
 *   1. 干净暖白径向底（warm off-white，全幅铺底，不发黄）
 *   2. 一处极轻暖光晕（hero 后一个大范围低透明 brand 径向，给一点温度层次，纯静态）
 * 纸纹层已移除（满屏纸纹 + 暖底显脏）。全 aria-hidden、绝对定位、z-0，落在内容之下。
 */

export default function PickerAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* 1. 纸底：干净暖白径向渐变（warm off-white，不发黄旧）——全幅铺底 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% -10%, #FFFDFB 0%, #FFF8F0 55%, #FFF3E9 100%)",
        }}
      />
      {/* 2. 极轻暖光晕：hero 后一处大范围低透明 brand 径向，给一点温度层次（纯静态） */}
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
