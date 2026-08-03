"use client";

/**
 * 风格切换入口（低干扰，两套 UI 共用一套跳转逻辑，但各自定制外观）
 * ─────────────────────────────────────────────
 * 点击 = 记住目标风格（写 localStorage）+ 路由跳到对应页面。
 * 灰度期可接受：切换时当前抽签/投签状态重置（换页即重置）。
 *
 * 刻意不合并两套 UI，只把「持久化 + 跳转」这一件事抽出来：
 *   - /picker（新版）里放「经典版」→ to="classic"
 *   - /water-concept（经典）里放「新版菜单板」→ to="menu"
 * 外观（className/文案）由各页传入，保证不抢各自主 CTA。
 */

import { useRouter } from "next/navigation";
import { UI_STYLE_ROUTES, writeUiStyle, type UiStyle } from "@/lib/ui-style";

type Props = {
  /** 要切到的目标风格。 */
  to: UiStyle;
  /** 按钮文案（各页自定，如「经典版」/「新版菜单板」）。 */
  children: React.ReactNode;
  /** 各页自定义样式（保证与该页视觉一致、且弱于主 CTA）。 */
  className?: string;
};

export default function StyleSwitch({ to, children, className }: Props) {
  const router = useRouter();

  const onSwitch = () => {
    writeUiStyle(to); // 先记住选择，刷新后仍保留
    router.push(UI_STYLE_ROUTES[to]); // 再跳到对应风格页面
  };

  return (
    <button type="button" onClick={onSwitch} className={className}>
      {children}
    </button>
  );
}
