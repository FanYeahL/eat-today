import { describe, it, expect } from "vitest";
import { trimEntries, MAX_ENTRIES, type DiaryEntry } from "@/lib/diary";

/** 造 n 条时间升序的假记录（ts 从 0 递增，便于断言保留的是哪几条） */
function makeEntries(n: number): DiaryEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    ts: i,
    meal: "lunch" as const,
    items: [],
  }));
}

describe("trimEntries", () => {
  it("未超上限 → 原样返回（同一引用，零拷贝）", () => {
    const e = makeEntries(3);
    expect(trimEntries(e, 5)).toBe(e);
  });

  it("恰好等于上限 → 原样返回", () => {
    const e = makeEntries(5);
    expect(trimEntries(e, 5)).toBe(e);
  });

  it("超上限 → 只保留最近的 max 条，裁掉最老的", () => {
    const e = makeEntries(10);
    const out = trimEntries(e, 4);
    expect(out).toHaveLength(4);
    // 时间升序，保留尾部最新的 → ts 应为 6,7,8,9
    expect(out.map((x) => x.ts)).toEqual([6, 7, 8, 9]);
  });

  it("max<=0 → 不裁（防误配清空日记）", () => {
    const e = makeEntries(3);
    expect(trimEntries(e, 0)).toBe(e);
    expect(trimEntries(e, -5)).toBe(e);
  });

  it("默认上限为 MAX_ENTRIES", () => {
    const e = makeEntries(MAX_ENTRIES + 10);
    expect(trimEntries(e)).toHaveLength(MAX_ENTRIES);
  });
});
