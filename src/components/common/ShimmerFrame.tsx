import type { ReactNode } from "react";

type ShimmerFrameProps = {
  children: ReactNode;
  /** 圆角，与内部元素对齐；默认 full（配胶囊按钮） */
  rounded?: string;
  className?: string;
};

/**
 * 流光边框容器
 * 一层 1px 的动画渐变描边包住 children，亮带缓慢横扫，
 * 给核心入口按钮一点「可点」的暗示，又不抢 vaporwave 的主视觉。
 * 用 padding 当边框厚度，内层背景盖住中间，只露出四周渐变。
 */
export default function ShimmerFrame({
  children,
  rounded = "rounded-full",
  className = "",
}: ShimmerFrameProps) {
  return (
    <div
      className={`${rounded} animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-brand/40 via-accent to-brand/40 p-px shadow-[0_4px_14px_rgb(var(--c-accent)_/_0.18)] ${className}`}
    >
      <div className={`${rounded} bg-base`}>{children}</div>
    </div>
  );
}
