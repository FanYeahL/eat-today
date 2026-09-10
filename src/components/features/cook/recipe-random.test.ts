import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_RECIPES, pickNextRecipe } from "./recipe-random";
afterEach(() => vi.restoreAllMocks());
describe("bounded recipe selection", () => {
  it("terminates even when random always selects the previous recipe", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickNextRecipe(ALL_RECIPES[0].id)).toBe(ALL_RECIPES[0]);
    expect(random).toHaveBeenCalledTimes(21);
  });
  it("normally avoids the previous recipe", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1 / ALL_RECIPES.length + 0.00001);
    expect(pickNextRecipe(ALL_RECIPES[0].id)).toBe(ALL_RECIPES[1]);
  });
  it("returns null for an empty dataset", () => {
    const original = ALL_RECIPES.splice(0);
    try {
      expect(pickNextRecipe(null)).toBeNull();
    } finally {
      ALL_RECIPES.push(...original);
    }
  });
});
