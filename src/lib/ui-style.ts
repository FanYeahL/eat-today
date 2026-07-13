/**
 * UI 风格偏好（灰度期「风格切换」的唯一可信源）
 * ─────────────────────────────────────────────
 * 两套风格共用同一套抽菜/查店/日记/偏好逻辑，只是表现层不同：
 *   - "classic" → /water-concept（经典水占）
 *   - "menu"    → /picker（新版菜单板）
 *
 * 记住用户上次选择：只在客户端读写 localStorage（key = foodie:ui-style）。
 * 未记录 / 读取失败 / 非法值都回落到默认 "menu"（首次访问进新版）。
 * 不引入 A/B 框架——就是一个持久化的开关。
 */

export type UiStyle = "classic" | "menu";

/** localStorage key（灰度期约定，跨会话保留选择）。 */
export const UI_STYLE_KEY = "foodie:ui-style";

/** 首次访问 / 无记录时的默认风格：新版菜单板。 */
export const DEFAULT_UI_STYLE: UiStyle = "menu";

/** 每套风格对应的路由（风格切换 = 路由切换）。 */
export const UI_STYLE_ROUTES: Record<UiStyle, string> = {
  classic: "/water-concept",
  menu: "/picker",
};

/**
 * 读上次选择。只能在客户端调用（SSR 期返回 null）。
 * 非法值一律视为「无记录」，交由调用方回落默认。
 */
export function readUiStyle(): UiStyle | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(UI_STYLE_KEY);
    return v === "classic" || v === "menu" ? v : null;
  } catch {
    // 隐私模式 / storage 被禁：当作无记录，不抛错。
    return null;
  }
}

/** 写入选择。storage 不可用时静默忽略（不影响本次切换的跳转）。 */
export function writeUiStyle(style: UiStyle): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UI_STYLE_KEY, style);
  } catch {
    // ignore
  }
}
