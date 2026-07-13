"use client";

/**
 * PickerBottomAction / 底部固定点餐按钮（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * clean food utility 重构：现代产品主按钮，不再是复古票据（橙红渐变 + 黑色 offset 硬投影
 * + Ben-Day 点阵）。改 solid tomato（--c-accent-hot）白字 + 轻 soft shadow，圆角柔和。
 *
 * 动效克制、全 transform/opacity + reduced-motion 降级：
 *  - tap：一次 press+glow（.picker-press-glow，soft box-shadow glow，JS 加 class、animationend 卸下）；
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
          className="w-full rounded-2xl bg-accent-hot py-4 text-lg font-bold tracking-wide text-white shadow-[0_6px_20px_rgb(var(--c-accent-hot)_/_0.28)] transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {casting ? "正在为你挑…" : PICK_CTA}
        </button>
      </div>
    </div>
  );
}
