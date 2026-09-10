import { afterEach, describe, it, expect, vi } from "vitest";
import { mockStorage } from "./storage-test-helpers";
import {
  trimPickLog,
  MAX_PICKLOG_ENTRIES,
  type PickLogEntry,
  getPickLog,
  logPick,
  acceptanceByEntity,
} from "@/lib/pick-log";

afterEach(() => vi.unstubAllGlobals());
describe("pick log storage boundary", () => {
  it("filters corrupt records and preserves valid acceptance statistics", () => {
    const storage = mockStorage();
    const [entry] = makeLog(1);
    storage.setItem(
      "foodie:picklog",
      JSON.stringify([
        null,
        { ts: 0, entityType: "dish", action: "accept" },
        { ...entry, priceTier: "bad" },
        entry,
      ]),
    );
    expect(getPickLog()).toEqual([entry]);
    logPick(
      { id: "f", name: "菜", entityType: "dish", priceTier: "normal" },
      "any",
      "reroll",
      1,
    );
    expect(acceptanceByEntity()).toEqual([
      { entityType: "dish", shown: 2, accepted: 1, acceptRate: 0.5 },
    ]);
  });
  it("tolerates invalid JSON, SSR and failed writes", () => {
    expect(getPickLog()).toEqual([]);
    const storage = mockStorage();
    storage.setItem("foodie:picklog", "{");
    expect(getPickLog()).toEqual([]);
    storage.setItem.mockImplementation(() => {
      throw new Error("full");
    });
    expect(() =>
      logPick(
        { id: "f", name: "菜", entityType: "dish", priceTier: "normal" },
        "any",
        "accept",
        0,
      ),
    ).not.toThrow();
  });
});

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
