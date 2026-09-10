// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDivinationPick, type CastResult } from "./useDivinationPick";
import { foods, foodsByMealForSinglePick } from "@/config/foods";
import { resolveCoords } from "@/lib/geo";
import { checkKeyword, cachedAvailability } from "@/lib/availability";

vi.mock("@/config/foods", async (original) => ({
  ...(await original<typeof import("@/config/foods")>()),
  foodsByMealForSinglePick: vi.fn(),
}));
vi.mock("@/lib/geo", () => ({ resolveCoords: vi.fn() }));
vi.mock("@/lib/availability", async (original) => ({
  ...(await original<typeof import("@/lib/availability")>()),
  checkKeyword: vi.fn(),
  cachedAvailability: vi.fn(),
}));
const chinese = foods
  .filter((f) => f.cuisine === "cn-generic" && f.kind === "main")
  .slice(0, 2);
const western = foods.find(
  (f) => f.cuisine === "western-italian" && f.kind === "main",
)!;
beforeEach(() => {
  localStorage.clear();
  vi.mocked(foodsByMealForSinglePick).mockReturnValue([...chinese, western]);
  vi.mocked(resolveCoords).mockReset().mockResolvedValue({ lng: 116, lat: 39 });
  vi.mocked(checkKeyword).mockReset().mockResolvedValue(false);
  vi.mocked(cachedAvailability).mockReset().mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("family → hard deduplication → availability contract", () => {
  it("never falls back to a seen dish or a different family when every shop is unavailable", async () => {
    const { result } = renderHook(() => useDivinationPick());
    act(() =>
      result.current.setFilters({
        families: ["chinese"],
        mood: "any",
        budget: "any",
      }),
    );
    let cast!: CastResult;
    await act(async () => {
      cast = await result.current.cast(new Set([chinese[0].id]));
    });
    expect(cast.food?.id).toBe(chinese[1].id);
    expect(checkKeyword).toHaveBeenCalledTimes(6);
  });
  it("reports exhaustion before trying location when the family pool has all been seen", async () => {
    const { result } = renderHook(() => useDivinationPick());
    act(() =>
      result.current.setFilters({
        families: ["chinese"],
        mood: "any",
        budget: "any",
      }),
    );
    let cast!: CastResult;
    await act(async () => {
      cast = await result.current.cast(new Set(chinese.map((f) => f.id)));
    });
    expect(cast).toEqual({ food: null, exhausted: true });
    expect(resolveCoords).not.toHaveBeenCalled();
  });
  it("fails open on location errors while retaining the hard unseen constraint", async () => {
    vi.mocked(resolveCoords).mockRejectedValue("timeout");
    const { result } = renderHook(() => useDivinationPick());
    await act(async () => {
      await result.current.cast(new Set([chinese[0].id, western.id]));
    });
    expect(result.current.pick?.id).toBe(chinese[1].id);
    expect(checkKeyword).not.toHaveBeenCalled();
    expect(result.current.verifying).toBe(false);
  });
  it("reset invalidates an outstanding location result", async () => {
    let finish!: (value: { lng: number; lat: number }) => void;
    vi.mocked(resolveCoords).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => useDivinationPick());
    let cast!: Promise<CastResult>;
    act(() => {
      cast = result.current.cast();
    });
    act(() => result.current.reset());
    await act(async () => {
      finish({ lng: 116, lat: 39 });
      await cast;
    });
    expect(result.current.pick).toBeNull();
    expect(result.current.verifying).toBe(false);
    expect(checkKeyword).not.toHaveBeenCalled();
  });
  it("clears verifying after an unexpected availability failure", async () => {
    vi.mocked(checkKeyword).mockRejectedValue(new Error("unexpected"));
    const { result } = renderHook(() => useDivinationPick());
    await act(async () => {
      await expect(result.current.cast()).rejects.toThrow("unexpected");
    });
    expect(result.current.verifying).toBe(false);
  });
});
