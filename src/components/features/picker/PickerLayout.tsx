"use client";

/**
 * PickerLayout / 三段式布局壳（V4 手机骨架，方案 §3.1）
 * ─────────────────────────────────────────────
 * 「画是舞台，UI 只占两条带」。手机端把内容排成三段：
 *   A 天空区（hero）：徽章 + 标题 + tagline，锚在画的天空负空间；
 *   B 画芯区（flex-1）：零 UI——只透出下方 z-0 的底图 + 动效薄层（焦点带禁入）；
 *   C 点餐坞（dock）：单一 .picker-glass 坞，上缘接住画的下沿。
 * 三段用 flex-col 撑满 min-h-screen：hero 与 dock 内容自适应高度，画芯吃掉中间全部富余
 * （flex-1）——短屏（667pt）画芯压缩但 hero/dock 不挤，保证单屏无滚动（方案 §3.1 高度预算）。
 *
 * 本层是 z-10 内容层，落在 PickerScene（z-0）之上；自身透明，画从背后透上来。
 * S4 会在 ≥lg 断点把这套 hero/dock 重排成桌面双栏，art 区留给此壳的 slot。
 */

import type { ReactNode } from "react";

type Props = {
  /** 顶栏（品牌行，跨 phase 常驻）。 */
  topbar?: ReactNode;
  /** A 天空区：hero 文字块。 */
  hero: ReactNode;
  /** C 点餐坞：tab + 筛选 + CTA + 页脚。 */
  dock: ReactNode;
};

export default function PickerLayout({ topbar, hero, dock }: Props) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col">
      {/* 顶栏 + 天空区 hero：靠上排布，坐在画的天空负空间 */}
      <div className="px-5 pt-6">
        {topbar}
        <div className="mt-4">{hero}</div>
      </div>

      {/* 画芯区：吃掉中间全部富余高度，零 UI——只透出背后底图焦点带 */}
      <div className="flex-1" aria-hidden />

      {/* 点餐坞：贴底，上缘实体边界接住画的下沿 */}
      {dock}
    </div>
  );
}
