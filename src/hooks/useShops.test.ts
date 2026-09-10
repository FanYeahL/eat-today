// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCoords } from "@/lib/geo";
import { useShops } from "./useShops";

vi.mock("@/lib/geo", () => ({ resolveCoords: vi.fn() }));
const fetchMock = vi.fn<typeof fetch>();
const payload = (id: string) =>
  new Response(JSON.stringify({ shops: [{ id }], via: "location" }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.mocked(resolveCoords).mockReset().mockResolvedValue({ lng: 116, lat: 39 });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useShops cancellation and recovery", () => {
  it("shows query errors after location recovers instead of trapping the user in city selection", async () => {
    const { result } = renderHook(() => useShops());
    vi.mocked(resolveCoords).mockRejectedValueOnce("timeout");
    await act(async () => {
      await result.current.fetchShops("店");
    });
    expect(result.current.needCity).toBe(true);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "上游失败" }), { status: 502 }),
    );
    await act(async () => {
      await result.current.fetchShops("店");
    });
    expect(result.current).toMatchObject({
      needCity: false,
      error: "上游失败",
      loading: false,
    });
  });
  it("aborts old fetches and ignores late results/finally", async () => {
    const a = deferred<Response>();
    const b = deferred<Response>();
    fetchMock.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result } = renderHook(() => useShops());
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = result.current.fetchShops("first", "北京");
    });
    const signal = fetchMock.mock.calls[0][1]?.signal;
    await act(async () => {
      second = result.current.fetchShops("second", "北京");
    });
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      a.resolve(payload("old"));
      await first;
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.shops).toEqual([]);
    await act(async () => {
      b.resolve(payload("new"));
      await second;
    });
    expect(result.current.shops[0].id).toBe("new");
    expect(result.current.loading).toBe(false);
  });
  it("does not send a request after clear while waiting for shared location", async () => {
    const location = deferred<{ lng: number; lat: number }>();
    vi.mocked(resolveCoords).mockReturnValue(location.promise);
    const { result } = renderHook(() => useShops());
    let request!: Promise<void>;
    act(() => {
      request = result.current.fetchShops("店");
    });
    act(() => result.current.clear());
    await act(async () => {
      location.resolve({ lng: 116, lat: 39 });
      await request;
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      loading: false,
      fetched: false,
      needCity: false,
    });
  });
  it("invalidates pending location on unmount", async () => {
    const location = deferred<{ lng: number; lat: number }>();
    vi.mocked(resolveCoords).mockReturnValue(location.promise);
    const { result, unmount } = renderHook(() => useShops());
    let request!: Promise<void>;
    act(() => {
      request = result.current.fetchShops("店");
    });
    unmount();
    location.resolve({ lng: 116, lat: 39 });
    await request;
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("recovers from location failure and retains city fallback for denied permission", async () => {
    const { result } = renderHook(() => useShops());
    vi.mocked(resolveCoords).mockRejectedValueOnce("timeout");
    await act(async () => {
      await result.current.fetchShops("店");
    });
    expect(result.current).toMatchObject({
      needCity: true,
      geoReason: "timeout",
    });
    fetchMock.mockResolvedValueOnce(payload("nearby"));
    await act(async () => {
      await result.current.fetchShops("店");
    });
    expect(result.current).toMatchObject({
      needCity: false,
      geoReason: null,
      fetched: true,
    });
    expect(fetchMock.mock.calls[0][0]).toContain("lng=116");
    vi.mocked(resolveCoords).mockRejectedValueOnce("denied");
    await act(async () => {
      await result.current.fetchShops("店");
    });
    fetchMock.mockResolvedValueOnce(payload("city"));
    await act(async () => {
      await result.current.fetchShops("店", "北京");
    });
    expect(result.current.needCity).toBe(false);
    expect(String(fetchMock.mock.calls[1][0])).toContain("city=");
  });
});
