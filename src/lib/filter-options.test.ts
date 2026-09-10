import { expect, it } from "vitest";
import {
  filterOptions,
  showsRegion,
  toggleFilterFamily,
} from "./filter-options";
import { DEFAULT_FILTERS } from "./pick-core";
it("shares option identities while preserving intentional theme copy", () => {
  const picker = filterOptions("picker");
  const water = filterOptions("water");
  expect(picker.moods.map((o) => o.key)).toEqual(water.moods.map((o) => o.key));
  expect(picker.budgets.map((o) => o.key)).toEqual(
    water.budgets.map((o) => o.key),
  );
  expect(picker.moods[0].label).toBe("不挑心情");
  expect(water.moods[0].label).toBe("都行");
});
it("toggles multiple families and only exposes region for Chinese/all", () => {
  const western = toggleFilterFamily(DEFAULT_FILTERS, "western");
  expect(showsRegion(western)).toBe(false);
  const mixed = toggleFilterFamily(western, "chinese");
  expect(mixed.families).toEqual(["western", "chinese"]);
  expect(showsRegion(mixed)).toBe(true);
  expect(toggleFilterFamily(western, "western")).toEqual(DEFAULT_FILTERS);
});
