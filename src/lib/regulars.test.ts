import { afterEach, describe, expect, it, vi } from "vitest";
import { getAffinity, recordVisit, type VisitEvent } from "./regulars";
import { mockStorage } from "./storage-test-helpers";

afterEach(() => vi.unstubAllGlobals());
const now = 1_800_000_000_000;
const visit: Omit<VisitEvent, "ts"> = {
  shopId: "shop",
  shopName: "店",
  foodId: "rice",
  cuisine: "cn-generic",
  kind: "main",
};
describe("常客持久化与加权", () => {
  it("counts distinct shops, caps boosts, and ignores drinks and old events", () => {
    mockStorage();
    recordVisit(visit, now);
    recordVisit(visit, now);
    expect(getAffinity(now)).toEqual({
      byFood: { rice: 1.5 },
      byCuisine: { "cn-generic": 1.25 },
    });
    for (let i = 0; i < 8; i++)
      recordVisit({ ...visit, shopId: String(i) }, now);
    recordVisit({ ...visit, foodId: "drink", kind: "drink" }, now);
    recordVisit({ ...visit, foodId: "old" }, now - 29 * 86400000);
    expect(getAffinity(now)).toEqual({
      byFood: { rice: 2.2 },
      byCuisine: { "cn-generic": 1.9 },
    });
  });
  it("filters incomplete and invalid events", () => {
    const storage = mockStorage();
    storage.setItem(
      "foodie:visits",
      JSON.stringify([
        null,
        { shopId: "bad", ts: now },
        { ...visit, cuisine: "oops", ts: now },
        { ...visit, ts: now },
      ]),
    );
    expect(getAffinity(now).byFood).toEqual({ rice: 1.5 });
  });
  it("retains only 300 recent events when writing", () => {
    const storage = mockStorage();
    storage.setItem(
      "foodie:visits",
      JSON.stringify([{ ...visit, ts: now - 31 * 86400000 }]),
    );
    for (let i = 0; i < 302; i++)
      recordVisit({ ...visit, shopId: String(i) }, now + i);
    const events = JSON.parse(storage.getItem("foodie:visits")!);
    expect(events).toHaveLength(300);
    expect(events[0].shopId).toBe("2");
  });
  it("degrades safely for SSR, broken JSON and storage errors", () => {
    expect(getAffinity(now)).toEqual({ byFood: {}, byCuisine: {} });
    const storage = mockStorage();
    storage.setItem("foodie:visits", "{");
    expect(getAffinity(now).byFood).toEqual({});
    storage.setItem.mockImplementation(() => {
      throw new Error("full");
    });
    expect(() => recordVisit(visit, now)).not.toThrow();
  });
});
