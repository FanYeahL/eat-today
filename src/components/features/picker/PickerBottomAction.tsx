"use client";

/**
 * PickerBottomAction / 底部固定点餐按钮（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * 拇指区固定行动条。MCM「点餐票据」质感：番茄红→橙渐变主操作（橙红只在主操作出现，
 * 不铺满整页）+ 深棕硬投影（MCM offset shadow，非柔阴影）+ Ben-Day 点阵（.picker-dots）。
 *
 * 动效克制、全 transform/opacity + reduced-motion 降级，无环境循环高光：
 *  - tap：一次 press+glow（.picker-press-glow，JS 加 class、animationend 卸下）；
 *  - active:scale 兜底触控反馈（移动端 tap 也有感）。
 */

import { PICK_CTA } from "./picker-copy";

type Props = {
  /** 主按钮 ref：tap 时挂 .picker-press-glow（父组件持有以复用既有反馈逻辑）。 */
  btnRef: React.RefObject<HTMLButtonElement>;
  onPick: () => void;
  casting: boolean;
};

export default function PickerBottomAction({ btnRef, onPick, casting }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-6">
      <div className="pointer-events-auto w-full max-w-md">
        <button
          ref={btnRef}
          onClick={onPick}
          onAnimationEnd={(e) => {
            // tap 的 press-glow 播完即卸载 class（无其它动画跑在此按钮上）。
            if (e.animationName.includes("press-glow")) {
              btnRef.current?.classList.remove("picker-press-glow");
            }
          }}
          disabled={casting}
          className="picker-dots w-full rounded-2xl border-2 border-ink/80 bg-gradient-to-r from-accent-hot to-brand py-4 text-lg font-black tracking-wide text-white shadow-[-4px_4px_0_0_rgb(var(--c-ink))] transition-transform active:translate-x-[-2px] active:translate-y-[2px] active:scale-[0.99] disabled:opacity-70"
        >
          {casting ? "正在为你挑…" : PICK_CTA}
        </button>
      </div>
    </div>
  );
}
