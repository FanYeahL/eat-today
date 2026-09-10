// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFoodOrchestration } from "./useFoodOrchestration";
import { useDivinationPick, type CastResult } from "./useDivinationPick";
import { useShops } from "./useShops";
import { foods } from "@/config/foods";
import { DEFAULT_FILTERS } from "@/lib/pick-core";
import { getEntries } from "@/lib/diary";
import { getPickLog } from "@/lib/pick-log";

vi.mock("./useDivinationPick", () => ({ useDivinationPick: vi.fn() }));
vi.mock("./useShops", () => ({ useShops: vi.fn() }));
const food = foods[0];
const nextFood = foods[1];
function makeDiv() {
  return {
    pick: food,
    pickKeyword: "店",
    verifying: false,
    meal: "lunch" as const,
    region: "all" as const,
    filters: DEFAULT_FILTERS,
    cast: vi
      .fn<(seen?: Set<string>) => Promise<CastResult>>()
      .mockResolvedValue({ food: nextFood, exhausted: false }),
    reset: vi.fn(),
    setMeal: vi.fn(),
    setRegion: vi.fn(),
    setFilters: vi.fn(),
  };
}
function makeShops() {
  return {
    shops: [],
    expansion: [],
    loading: false,
    error: null,
    fetched: false,
    needCity: false,
    geoReason: null,
    fetchShops: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  };
}
let div: ReturnType<typeof makeDiv>;
let shops: ReturnType<typeof makeShops>;
beforeEach(() => {
  localStorage.clear();
  div = makeDiv();
  shops = makeShops();
  vi.mocked(useDivinationPick).mockReturnValue(div);
  vi.mocked(useShops).mockReturnValue(shops);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("shared food orchestration", () => {
  it("locks duplicate actions including basket updates and logging", async () => {
    let finish!: (result: CastResult) => void;
    div.cast.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => useFoodOrchestration());
    act(() => {
      result.current.onAddAndRecast();
      result.current.onAddAndRecast();
      result.current.onSkipAndRecast();
    });
    expect(result.current.basket).toEqual([food]);
    expect(div.cast).toHaveBeenCalledTimes(1);
    expect(getPickLog()).toHaveLength(1);
    expect(div.cast.mock.calls[0][0]?.has(food.id)).toBe(true);
    await act(async () => finish({ food: nextFood, exhausted: false }));
    expect(result.current.casting).toBe(false);
  });
  it("confirms the deduplicated table once, and re-explores without another diary entry", async () => {
    const onExplore = vi.fn();
    const { result, rerender } = renderHook(() =>
      useFoodOrchestration({ onExplore }),
    );
    await act(async () => result.current.onAddAndRecast());
    div.pick = nextFood;
    rerender();
    act(() => result.current.onConfirm());
    expect(result.current.confirmed).toEqual([food, nextFood]);
    expect(getEntries()).toHaveLength(1);
    expect(getEntries()[0].items.map((f) => f.id)).toEqual([
      food.id,
      nextFood.id,
    ]);
    act(() => result.current.onReExplore());
    expect(getEntries()).toHaveLength(1);
    expect(onExplore).toHaveBeenCalledTimes(2);
    act(() => result.current.onPickExploreDish(nextFood.id));
    expect(result.current.exploringFood?.id).toBe(nextFood.id);
    act(() => result.current.onVisitShop({ id: "shop", name: "店" }));
    expect(JSON.parse(localStorage.getItem("foodie:visits")!)[0].foodId).toBe(
      nextFood.id,
    );
  });
  it("basket-only confirmation excludes the current result", async () => {
    const { result, rerender } = renderHook(() => useFoodOrchestration());
    await act(async () => result.current.onAddAndRecast());
    div.pick = nextFood;
    rerender();
    act(() => result.current.onConfirmBasketOnly());
    expect(getEntries()[0].items.map((f) => f.id)).toEqual([food.id]);
  });
  it.each([false, true])(
    "preserves explicit fresh-cast policy: exclude previous=%s",
    async (excludeCurrentOnFresh) => {
      const { result } = renderHook(() =>
        useFoodOrchestration({ excludeCurrentOnFresh }),
      );
      await act(async () => result.current.onFreshRecast());
      expect(div.cast.mock.calls[0][0]?.has(food.id)).toBe(
        excludeCurrentOnFresh,
      );
    },
  );
  it("returns exhausted without pretending a successful reveal", async () => {
    div.cast.mockResolvedValue({ food: null, exhausted: true });
    const onCastResult = vi.fn();
    const { result } = renderHook(() => useFoodOrchestration({ onCastResult }));
    await act(async () => {
      await result.current.runCast();
    });
    expect(result.current.exhausted).toBe(true);
    expect(onCastResult).toHaveBeenCalledWith(
      { food: null, exhausted: true },
      "initial",
    );
    act(() => result.current.onChangeMeal("dinner"));
    expect(result.current.exhausted).toBe(false);
  });
  it("honors the picker suspense window and clears timers on home", async () => {
    vi.useFakeTimers();
    const onCastResult = vi.fn();
    const { result } = renderHook(() =>
      useFoodOrchestration({ minRevealMs: 700, onCastResult }),
    );
    let cast!: Promise<void>;
    act(() => {
      cast = result.current.runCast();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(699);
    });
    expect(onCastResult).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await cast;
    });
    expect(onCastResult).toHaveBeenCalledTimes(1);
    act(() => {
      cast = result.current.runCast();
    });
    act(() => result.current.onHome());
    await act(async () => {
      await cast;
    });
    expect(onCastResult).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(shops.clear).toHaveBeenCalled();
  });
  it("releases locks on failure and allows retry", async () => {
    div.cast.mockRejectedValueOnce(new Error("failed"));
    const failed = vi.fn();
    const { result } = renderHook(() =>
      useFoodOrchestration({ onCastFailed: failed }),
    );
    await act(async () => {
      await result.current.runCast();
    });
    expect(result.current.casting).toBe(false);
    expect(result.current.castError).not.toBeNull();
    expect(failed).toHaveBeenCalledOnce();
    await act(async () => {
      await result.current.runCast();
    });
    expect(result.current.castError).toBeNull();
    expect(div.cast).toHaveBeenCalledTimes(2);
  });
});
