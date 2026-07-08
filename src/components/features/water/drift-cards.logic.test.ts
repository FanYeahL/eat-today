import { describe, it, expect } from "vitest";
import { shopsSignature, clampFocus } from "./drift-cards.logic";

// 复现并锁死「切菜后卡片空白」bug 的纯逻辑（组件渲染门控 offset = i - focus）。

describe("shopsSignature（切菜检测：只在店集内容变化时变）", () => {
  it("同内容不同数组引用 → 签名相同（防每帧 reset focus）", () => {
    const a = [{ id: "s1" }, { id: "s2" }];
    const b = [{ id: "s1" }, { id: "s2" }];
    expect(shopsSignature(a)).toBe(shopsSignature(b));
  });

  it("换另一道菜的店集（id 不同）→ 签名变化 → 触发 focus reset", () => {
    const dishA = [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }];
    const dishB = [{ id: "b1" }]; // 新菜只有 1 家
    expect(shopsSignature(dishA)).not.toBe(shopsSignature(dishB));
  });

  it("长度变化即变化（子集也算换集）", () => {
    expect(shopsSignature([{ id: "s1" }, { id: "s2" }])).not.toBe(
      shopsSignature([{ id: "s1" }]),
    );
  });

  it("空列表签名稳定且区别于非空", () => {
    expect(shopsSignature([])).toBe(shopsSignature([]));
    expect(shopsSignature([])).not.toBe(shopsSignature([{ id: "s1" }]));
  });

  it("顺序不同 → 签名不同（重排也重置，避免顶层卡错位）", () => {
    expect(shopsSignature([{ id: "s1" }, { id: "s2" }])).not.toBe(
      shopsSignature([{ id: "s2" }, { id: "s1" }]),
    );
  });
});

describe("clampFocus（渲染时夹紧，绝不产生 offset 全为负的空白帧）", () => {
  it("正常范围内原样返回", () => {
    expect(clampFocus(0, 3)).toBe(0);
    expect(clampFocus(2, 3)).toBe(2);
  });

  it("切到更短列表：旧高 focus 超界 → 绕回，不空白（原 bug 核心）", () => {
    // 曾在 4 家里划到第 4 张（focus=3），切到只有 1 家的菜：
    // 旧代码 offset = 0 - 3 = -3 → 全过滤 → 空白。夹紧后落回 0。
    expect(clampFocus(3, 1)).toBe(0);
    expect(clampFocus(3, 2)).toBe(1);
  });

  it("空列表 → 0（不为负，交上层空态处理）", () => {
    expect(clampFocus(5, 0)).toBe(0);
    expect(clampFocus(0, 0)).toBe(0);
  });

  it("负值防御 → 规整回非负", () => {
    expect(clampFocus(-1, 3)).toBe(2);
    expect(clampFocus(-4, 3)).toBe(2);
  });

  it("任意 focus × 任意非空 count → 结果恒在 [0,count)，永不触发 offset<0 全过滤", () => {
    for (let count = 1; count <= 6; count++) {
      for (let f = -10; f <= 10; f++) {
        const r = clampFocus(f, count);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(count);
      }
    }
  });
});
