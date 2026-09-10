import { afterEach, describe, it, expect, vi } from "vitest";
import {
  trimEntries,
  MAX_ENTRIES,
  getEntries,
  computeStats,
  gentleReminder,
  recentFoodIds,
  addEntry,
  type DiaryEntry,
} from "@/lib/diary";
import { foods } from "@/config/foods";
import { mockStorage } from "./storage-test-helpers";

afterEach(() => vi.unstubAllGlobals());

describe("损坏日记恢复", () => {
  const now = new Date(2026, 8, 11, 12).getTime();
  const food = {
    id: "rice",
    name: "米饭",
    emoji: "🍚",
    cuisine: "cn-generic",
    spicy: 0,
    tags: ["清淡"],
  };
  const entry = (items: unknown[]) => ({ ts: now, meal: "lunch", items });
  function write(value: unknown) {
    const storage = mockStorage();
    storage.setItem("foodie:diary", JSON.stringify(value));
    return storage;
  }
  it("drops null-only records and safely exposes empty stats", () => {
    write([entry([null])]);
    expect(getEntries()).toEqual([]);
    expect(computeStats(now)).toMatchObject({ total: 0, hasData: false });
    expect(gentleReminder(now)).toBeNull();
    expect(recentFoodIds(now)).toEqual(new Set());
  });
  it("salvages good items without rewriting storage", () => {
    const storage = write([entry([food, { name: "坏数据" }])]);
    expect(getEntries()[0].items).toEqual([food]);
    expect(computeStats(now).topFamily?.count).toBe(1);
    expect(recentFoodIds(now)).toEqual(new Set(["rice"]));
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
  it("validates display fields, enums and numbers, including the reminder's full path", () => {
    const invalid = [
      null,
      { ...food, id: null },
      { ...food, name: null },
      { ...food, emoji: 2 },
      { ...food, cuisine: "unknown" },
      { ...food, tags: [null] },
      { ...food, tags: "清淡" },
      { ...food, spicy: 9 },
    ];
    write([
      entry(invalid),
      entry([...invalid, food]),
      entry([food]),
      entry([food]),
    ]);
    expect(getEntries()).toHaveLength(3);
    expect(computeStats(now).total).toBe(3);
    expect(gentleReminder(now)).toContain("克制");
  });
  it("rejects bad envelopes and preserves good record order", () => {
    write([
      null,
      { ...entry([food]), ts: "yesterday" },
      { ...entry([food]), meal: "never" },
      entry([food]),
      { ...entry([food]), ts: now + 1 },
    ]);
    expect(getEntries().map((e) => e.ts)).toEqual([now, now + 1]);
  });
  it("handles broken JSON, unavailable storage and SSR", () => {
    const storage = mockStorage();
    storage.setItem("foodie:diary", "{");
    expect(getEntries()).toEqual([]);
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getEntries()).toEqual([]);
    expect(() => addEntry([foods[0]], "lunch", now)).not.toThrow();
    vi.stubGlobal("window", undefined);
    expect(getEntries()).toEqual([]);
  });
  it("round-trips newly written entries", () => {
    mockStorage();
    addEntry([foods[0]], "lunch", now);
    expect(getEntries()[0].items[0].id).toBe(foods[0].id);
  });
});

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
