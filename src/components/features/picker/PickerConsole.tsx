"use client";

/**
 * PickerConsole / phase 内容坞（V4 S5，方案 §5「画不动、坞换内容」）
 * ─────────────────────────────────────────────
 * picking / result / shops 三个 phase 的内容容器，与 choose 屏的 PickerLayout 右栏同构：
 *   手机（< lg）：单列居中（mx-auto max-w-md），撑满 min-h-screen——内容浮在 z-0 全屏场景上，
 *     与旧版逐像素一致（零回归）。
 *   桌面（≥ lg）：左留 --gallery-w 宽的画廊占位（画从 z-0 透上来、不动），内容落右侧操作台栏
 *     （≤440px 居中，竖向按 align 定位）。画不动、只有这一栏换内容。
 *
 * align：内容在操作台栏的纵向对齐——picking 居中（center）、result/shops 顶对齐（start，
 * 内容长、允许自然流+滚动）。本层是 z-10 内容层，落在 PickerScene（z-0）之上；自身透明。
 */

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 操作台栏内容纵向对齐（桌面）：居中 or 顶对齐。默认 center。 */
  align?: "center" | "start";
  /** 附加到内容列的类（padding / gap 等，各 phase 自定）。 */
  className?: string;
};

export default function PickerConsole({
  children,
  align = "center",
  className = "",
}: Props) {
  // 纵向对齐：center 全视口居中（picking 悬念屏）；start 顶对齐让内容自然下流（result/shops）。
  const justify = align === "center" ? "justify-center" : "justify-start";
  return (
    <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
      {/* 画廊占位（桌面）：让出 --gallery-w 宽给 z-0 的画，内容不压画。手机无此栏。 */}
      <div
        aria-hidden
        className="hidden lg:block lg:w-[var(--gallery-w,46vw)] lg:flex-none"
      />
      {/* 操作台栏：手机满宽单列居中（透明，浮全屏场景上）；桌面右栏 bg-base + --glow 打光
          （与 PickerLayout choose 右栏同款，切 phase 背景不跳变）。 */}
      <div
        className={`relative flex flex-1 flex-col lg:bg-base lg:px-8 lg:py-10 ${justify}`}
      >
        {/* 桌面 --glow 打光：自画廊一侧（左）叠极淡时段光源色线性光晕。手机 hidden。 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(90deg, rgb(var(--glow) / 0.12) 0%, transparent 42%)",
          }}
        />
        <div
          className={`relative mx-auto flex w-full max-w-md flex-col lg:max-w-[440px] ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
