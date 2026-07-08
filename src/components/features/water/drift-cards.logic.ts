/**
 * DriftCards 的纯逻辑（无 React / DOM，node 环境可单测）
 * ─────────────────────────────────────────────
 * 抽出来解决「切菜后卡片空白」的 bug：focus 是组件内部 state，切另一道菜时
 * shops 换成更短的列表，但 focus 还停在旧的高 index → offset = i - focus 全为负
 * → 渲染时全被 `offset < 0` 过滤掉 → 界面像没店（DriftCards.tsx 的 offset 门控）。
 *
 * 两道防线，都在这里定义、组件消费：
 * 1. shopsSignature：把当前 shop 列表压成一个稳定字符串。父层每帧重建 driftShops
 *    数组（新引用），不能用数组引用做 effect 依赖（会每帧 reset）；用「内容签名」
 *    只在真正换了店集时变化，据此 setFocus(0)。
 * 2. clampFocus：渲染时再夹一层，focus 落在 [0, count)，即便 effect 还没跑也不空白。
 */

import type { DriftShop } from "./DriftCards";

/**
 * 把 shop 列表压成稳定签名：`长度|id0,id1,...`。
 * 只依赖 id 序列——父层重排/换菜导致 id 集合变化时签名才变，纯重渲染（同内容新数组）不变。
 * 空列表返回 "0|"，与「一家店都没有」区分于任意非空集。
 */
export function shopsSignature(shops: Pick<DriftShop, "id">[]): string {
  return `${shops.length}|${shops.map((s) => s.id).join(",")}`;
}

/**
 * 把 focus 夹进合法可见范围 [0, count)：
 * - count<=0（空列表）→ 0（无卡可渲染，交给上层的空态处理，这里只保证不为负）。
 * - 否则取模，超界（切到更短列表）自动绕回，绝不产生「全 offset<0」的空白帧。
 */
export function clampFocus(focus: number, count: number): number {
  if (count <= 0) return 0;
  // focus 可能为负（防御）或 >=count（切菜后旧值）——先规整到非负再取模。
  const f = Math.trunc(focus);
  return ((f % count) + count) % count;
}
