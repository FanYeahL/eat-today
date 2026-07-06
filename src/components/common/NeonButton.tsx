import Link from "next/link";
import type { ComponentProps } from "react";

type NeonButtonProps = {
  /** 按钮文字 */
  children: React.ReactNode;
  /** 跳转目标；传了就渲染成 Link，否则渲染成 button */
  href?: string;
  /** 视觉强度：primary 为高亮主按钮，ghost 为描边次按钮 */
  variant?: "primary" | "ghost";
} & Omit<ComponentProps<"button">, "ref">;

/**
 * 通用霓虹按钮
 * vaporwave 风格：粉紫描边 + 辉光，hover 时辉光增强。
 * 既能当跳转链接（传 href），也能当普通按钮（传 onClick）。
 */
export default function NeonButton({
  children,
  href,
  variant = "primary",
  className = "",
  ...rest
}: NeonButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none";

  const variants: Record<NonNullable<NeonButtonProps["variant"]>, string> = {
    primary:
      "text-white bg-gradient-to-r from-accent-hot to-brand shadow-[0_4px_14px_rgb(var(--c-accent-hot)_/_0.18)] hover:shadow-[0_4px_14px_rgb(var(--c-accent-hot)_/_0.18)] hover:-translate-y-0.5",
    ghost:
      "text-brand-soft border border-brand/60 bg-brand/5 shadow-[0_4px_14px_rgb(var(--c-brand)_/_0.18)] hover:text-white hover:border-accent hover:shadow-[0_4px_14px_rgb(var(--c-accent)_/_0.18)]",
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
