import { describe, it, expect } from "vitest";
import {
  trimPickLog,
  MAX_PICKLOG_ENTRIES,
  type PickLogEntry,
} from "@/lib/pick-log";

/** 造 n 条时间升序的假埋点（ts 从 0 递增） */
function makeLog(n: number): PickLogEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    ts: i,
    foodId: `f${i}`,
    name: `dish${i}`,
    entityType: "dish" as const,
    priceTier: "normal" as const,
    budget: "any",
    action: "accept" as const,
  }));
}

describe("trimPickLog", () => {
  it("未超上限 → 原样返回", () => {
    const l = makeLog(3);
    expect(trimPickLog(l, 5)).toBe(l);
  });

  it("超上限 → 只保留最近的 max 条", () => {
    const l = makeLog(10);
    const out = trimPickLog(l, 3);
    expect(out.map((x) => x.ts)).toEqual([7, 8, 9]);
  });

  it("max<=0 → 不裁", () => {
    const l = makeLog(3);
    expect(trimPickLog(l, 0)).toBe(l);
  });

  it("默认上限为 MAX_PICKLOG_ENTRIES", () => {
    const l = makeLog(MAX_PICKLOG_ENTRIES + 5);
    expect(trimPickLog(l)).toHaveLength(MAX_PICKLOG_ENTRIES);
  });
});
