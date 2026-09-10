import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv("AMAP_KEY", "test-key-not-real");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("shops proxy", () => {
  it("retries HTTP 200 CUQPS failures without the framework data cache", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "0", info: "CUQPS_HAS_EXCEEDED_THE_LIMIT" }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "1",
            pois: [{ id: "x", name: "川菜馆", distance: "NaN" }],
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");
    const request = GET(
      new Request("http://localhost/api/shops?keyword=川菜&lng=116&lat=39"),
    );
    await vi.runAllTimersAsync();
    const response = await request;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toMatchObject({ cache: "no-store" });
      expect(init).not.toHaveProperty("next");
    }
    expect(await response.json()).toMatchObject({
      shops: [{ id: "x", distance: null }],
    });
  });
  it("does not retry business errors other than QPS, and logs their code", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "0",
            info: "INVALID_USER_KEY",
            infocode: "10001",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/shops?keyword=店&city=北京"),
    );
    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[api/shops] amap failure", {
      info: "INVALID_USER_KEY",
      infocode: "10001",
    });
  });
  it("logs transport errors without leaking request URLs or keys", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new Error(
            "failed https://amap.test/?key=test-key-not-real&location=116,39",
          ),
        ),
    );
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/shops?keyword=店&city=北京"),
    );
    expect(response.status).toBe(502);
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("test-key-not-real");
    expect(JSON.stringify(log.mock.calls)).not.toContain("116,39");
  });
  it("keeps count-only queries working with malformed POI entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              status: "1",
              pois: [null, 3, { name: "店", type: "餐饮服务" }],
            }),
          ),
        ),
    );
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/shops?keyword=川菜&city=北京&count=1"),
    );
    expect(await response.json()).toEqual({ count: 1 });
  });
});
