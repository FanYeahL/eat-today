"use client";

/**
 * PickerLayout / 自适应布局壳（V4，方案 §3.1 手机三段式 + §3.2 桌面双栏）
 * ─────────────────────────────────────────────
 * 「画是舞台，UI 只占两条带」。单一组件树 responsive，不分叉两套：
 *
 * 手机（< lg）：竖向三段——
 *   A 天空区 hero（徽章+标题+tagline，锚画天空负空间）；
 *   B 画芯区（flex-1，零 UI，透出底图焦点带）；
 *   C 点餐坞 dock（.picker-glass，上缘接画下沿）。撑满 min-h-screen 单屏无滚动。
 *
 * 桌面（≥ lg）：左画廊 + 右操作台双栏——
 *   左栏（--gallery-w 宽）留给 z-0 的画廊底图（PickerScene 画），hero 文字浮其天空区；
 *   右栏操作台（≤440px 内容列居中）放 dock：底色 --c-base + 一道 --glow 线性光晕
 *   （「场景给操作台打光」）。根治 DEF-1（宽视口底图被裁成天空）。
 *   超宽屏（≥ 2xl）：双栏整体封顶居中——封顶在 UniversalFoodPicker 的 stage 壳上做（画廊画 +
 *   操作台同处 stage，一起居中，不会错位），两侧余白露出 <main> 级的全屏氛围出血层（PickerAmbience）。
 *
 * 本层是 z-10 内容层，落在 PickerScene（z-0）之上；自身透明，画从背后透上来。
 */

import type { ReactNode } from "react";

type Props = {
  /** 顶栏（品牌行）。目前仅 choose 屏传入；picking/result/shops 走 PickerConsole，无此栏。 */
  topbar?: ReactNode;
  /** A 天空区：hero 文字块。 */
  hero: ReactNode;
  /** C 点餐坞：tab + 筛选 + CTA + 页脚。 */
  dock: ReactNode;
};

export default function PickerLayout({ topbar, hero, dock }: Props) {
  return (
    <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
      {/* 文字立足层 scrim（方案 §4.4）：整宽、从视口顶 y=0 起、同时段 --sky-0 色顶→透渐变。
          盖住顶栏 + hero 文字块（约上 34vh），给压画文字一个隐形立足层——不再是缩在 px-5
          里四边硬边的贴纸。桌面只需盖左画廊栏顶（lg:w-[--gallery-w]）。 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[34vh] lg:w-[var(--gallery-w,46vw)]"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--sky-0) / 0.92) 0%, rgb(var(--sky-0) / 0.55) 45%, transparent 100%)",
        }}
      />

      {/* ── 左：画廊栏（桌面）/ 天空区 + 画芯（手机）──
          手机：顶栏 + hero，然后 flex-1 画芯吃余高。
          桌面：占 --gallery-w 宽、满高，hero 浮在画的天空区（顶部靠上），画芯即整栏。 */}
      <div className="relative flex flex-1 flex-col lg:w-[var(--gallery-w,46vw)] lg:flex-none">
        <div className="relative mx-auto w-full max-w-md px-5 pt-6 lg:max-w-none lg:px-8 lg:pt-10">
          {topbar}
          <div className="mt-4">{hero}</div>
        </div>
        {/* 画芯：吃掉余高，零 UI——只透出背后底图焦点带 */}
        <div className="flex-1" aria-hidden />
      </div>

      {/* ── 右：操作台栏（桌面）/ 点餐坞贴底（手机）──
          手机：dock 直接贴底（rounded-t 坞）。
          桌面：独立一栏，底色 --c-base + --glow 光晕；内容列 ≤440px 居中、竖向居中，dock 落其中。 */}
      <div className="relative lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:bg-base lg:px-8 lg:py-10">
        {/* 桌面操作台的 --glow 打光：自画廊一侧（左）叠极淡时段光源色线性光晕。手机 hidden。 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(90deg, rgb(var(--glow) / 0.12) 0%, transparent 42%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-md lg:max-w-[440px]">{dock}</div>
      </div>
    </div>
  );
}
