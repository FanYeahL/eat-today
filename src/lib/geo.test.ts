import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedCoords,
  GEO_RETRY_MS,
  isGeoUnavailable,
  resetGeo,
  resolveCoords,
} from "./geo";

let success: PositionCallback;
let failure: PositionErrorCallback;
const getCurrentPosition = vi.fn(
  (ok: PositionCallback, fail: PositionErrorCallback) => {
    success = ok;
    failure = fail;
  },
);
function fail(code: number) {
  failure({
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    message: "test",
  });
}
function succeed() {
  success({
    coords: { longitude: 116.404, latitude: 39.915 },
  } as GeolocationPosition);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  resetGeo();
  getCurrentPosition.mockClear();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetGeo();
});

describe("shared geolocation cache", () => {
  it.each([2, 3])(
    "retries transient error %s exactly at expiry",
    async (code) => {
      const first = resolveCoords();
      fail(code);
      await expect(first).rejects.toBe(code === 2 ? "unavailable" : "timeout");
      expect(isGeoUnavailable()).toBe(true);
      vi.advanceTimersByTime(GEO_RETRY_MS - 1);
      await expect(resolveCoords()).rejects.toBe(
        code === 2 ? "unavailable" : "timeout",
      );
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(isGeoUnavailable()).toBe(false);
      const next = resolveCoords();
      succeed();
      await expect(next).resolves.toMatchObject({ lng: expect.any(Number) });
      expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    },
  );
  it("starts cooldown when the failure arrives", async () => {
    const first = resolveCoords();
    vi.advanceTimersByTime(8000);
    fail(3);
    await expect(first).rejects.toBe("timeout");
    vi.advanceTimersByTime(GEO_RETRY_MS - 1);
    expect(isGeoUnavailable()).toBe(true);
  });
  it("does not retry denied automatically, but explicit reset allows recovery", async () => {
    const first = resolveCoords();
    fail(1);
    await expect(first).rejects.toBe("denied");
    vi.advanceTimersByTime(GEO_RETRY_MS * 10);
    await expect(resolveCoords()).rejects.toBe("denied");
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    resetGeo();
    const next = resolveCoords();
    succeed();
    await next;
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });
  it("shares in-flight work even across reset, and converts only once", async () => {
    const first = resolveCoords();
    resetGeo();
    expect(resolveCoords()).toBe(first);
    succeed();
    const coords = await first;
    expect(coords.lng).toBeCloseTo(116.41024449916938, 8);
    expect(coords.lat).toBeCloseTo(39.91640428150164, 8);
    expect(await resolveCoords()).toBe(coords);
    expect(cachedCoords()).toBe(coords);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
  it("caches unsupported until explicit reset", async () => {
    vi.stubGlobal("navigator", {});
    await expect(resolveCoords()).rejects.toBe("unsupported");
    vi.advanceTimersByTime(GEO_RETRY_MS * 10);
    expect(isGeoUnavailable()).toBe(true);
  });
});
