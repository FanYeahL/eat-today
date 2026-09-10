import { describe, expect, it } from "vitest";
import { outOfChina, wgs84ToGcj02 } from "./gcj02";

describe("WGS-84 → GCJ-02", () => {
  it("matches the coordtransform published Beijing reference pair", () => {
    // https://github.com/wandergis/coordtransform#示例用法exampleusage
    const result = wgs84ToGcj02(116.404, 39.915);
    expect(result.lng).toBeCloseTo(116.41024449916938, 8);
    expect(result.lat).toBeCloseTo(39.91640428150164, 8);
  });
  it.each([
    [139.69, 35.68],
    [144.9631, -37.8136],
    [-0.1276, 51.5072],
  ])("passes through outside the bounding box: %s,%s", (lng, lat) => {
    expect(wgs84ToGcj02(lng, lat)).toEqual({ lng, lat });
  });
  it("defines the inclusive coarse boundary without claiming a country polygon", () => {
    expect(outOfChina(72.004, 0.8293)).toBe(false);
    expect(outOfChina(137.8347, 55.8271)).toBe(false);
    expect(outOfChina(72.0039, 30)).toBe(true);
    expect(outOfChina(110, 55.8272)).toBe(true);
    expect(outOfChina(127, 37)).toBe(false); // Known box limitation: includes overseas locations.
  });
  it.each([
    [NaN, 30],
    [110, Infinity],
    [181, 30],
    [110, -91],
  ])("rejects invalid coordinates", (lng, lat) => {
    expect(() => wgs84ToGcj02(lng, lat)).toThrow(RangeError);
  });
});
