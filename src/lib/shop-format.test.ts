import { expect, it } from "vitest";
import { fmtDistance } from "./shop-format";
it("formats distances and hides invalid values", () => {
  expect([null, NaN, Infinity, -1].map(fmtDistance)).toEqual(["", "", "", ""]);
  expect([0, 240, 1250].map(fmtDistance)).toEqual(["0m", "240m", "1.3km"]);
});
