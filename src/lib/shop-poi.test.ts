import { describe, expect, it } from "vitest";
import { normalizeShops, toShop } from "./shop-poi";

describe("POI normalization", () => {
  it("keeps same-name branches at different locations with stable identities", () => {
    const pois = [
      { name: "店", location: "116,39" },
      { name: "店", location: "116.1,39" },
    ];
    const shops = normalizeShops(pois);
    expect(shops).toHaveLength(2);
    expect(shops[0].id).not.toBe(shops[1].id);
    expect(normalizeShops(pois)).toEqual(shops);
  });
  it("deduplicates within and across tiers, preferring real IDs", () => {
    const seen = new Set<string>();
    const poi = { id: "real", name: "店" };
    expect(normalizeShops([poi, poi], seen)).toHaveLength(1);
    expect(normalizeShops([poi], seen)).toEqual([]);
  });
  it("drops nameless and unidentified records, uses address as last fallback", () => {
    expect(toShop({ id: "x", name: " " })).toBeNull();
    expect(toShop({ name: "店", location: "garbage" })).toBeNull();
    expect(toShop({ name: "店", address: "路 1 号" })?.id).toContain("address");
  });
  it.each(["NaN", "Infinity", "-1", [], null, "", "  "])(
    "normalizes invalid distance/rating to null: %s",
    (value) => {
      expect(
        toShop({
          id: "x",
          name: "店",
          distance: value,
          biz_ext: { rating: value },
        }),
      ).toMatchObject({ distance: null, rating: null });
    },
  );
  it("retains zero distance and numeric ratings", () => {
    expect(
      toShop({
        id: "x",
        name: "店",
        distance: "0",
        biz_ext: { rating: "4.5" },
      }),
    ).toMatchObject({ distance: 0, rating: 4.5 });
  });
});
