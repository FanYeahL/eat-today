// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useWaterDivination } from "./useWaterDivination";
import { TIMING } from "@/lib/water-motion";
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("advances through fallback timers when animation callbacks are missing", async () => {
  const { result } = renderHook(() => useWaterDivination());
  act(() => result.current.cast());
  expect(result.current.phase).toBe("casting");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TIMING.contact * 1000);
  });
  expect(result.current.phase).toBe("splash");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TIMING.beat * 1000);
  });
  expect(result.current.phase).toBe("revealing");
  await act(async () => {
    await vi.advanceTimersByTimeAsync((TIMING.develop + 0.2) * 1000);
  });
  expect(result.current.phase).toBe("revealed");
  act(() => result.current.explore());
  expect(result.current.phase).toBe("exploring");
  act(() => result.current.backToSlip());
  expect(result.current.phase).toBe("revealed");
});
it("does not advance twice when callback and timer both arrive", async () => {
  const { result } = renderHook(() => useWaterDivination());
  act(() => result.current.cast());
  act(() => {
    result.current.onSlipAlighted();
    result.current.onSlipAlighted();
  });
  expect(result.current.phase).toBe("splash");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TIMING.contact * 1000);
  });
  expect(result.current.phase).not.toBe("casting");
  act(() => result.current.reset());
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  expect(result.current.phase).toBe("idle");
  expect(vi.getTimerCount()).toBe(0);
});
it("cleans timers on unmount", () => {
  const { result, unmount } = renderHook(() => useWaterDivination());
  act(() => result.current.cast());
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
