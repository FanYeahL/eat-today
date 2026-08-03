import { describe, it, expect, vi } from "vitest";
import {
  parseShopQuery,
  isQueryError,
  fetchWithTimeout,
  MAX_KEYWORD_LEN,
  MAX_CITY_LEN,
  type ShopQuery,
} from "@/lib/shop-query";

/** 从对象建 URLSearchParams（值都转字符串，模拟真实 query） */
function qs(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

/** 断言解析成功并返回 ShopQuery（顺带收窄类型） */
function ok(params: URLSearchParams): ShopQuery {
  const r = parseShopQuery(params);
  if (isQueryError(r)) {
    throw new Error(`expected ok, got error: ${r.error}`);
  }
  return r;
}

describe("parseShopQuery — keyword 校验", () => {
  it("缺 keyword → 400", () => {
    const r = parseShopQuery(qs({}));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("keyword 全空白 → 400", () => {
    const r = parseShopQuery(qs({ keyword: "   " }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("keyword 会被 trim", () => {
    expect(ok(qs({ keyword: "  黄焖鸡  " })).keyword).toBe("黄焖鸡");
  });

  it("keyword 超长 → 400", () => {
    const long = "菜".repeat(MAX_KEYWORD_LEN + 1);
    const r = parseShopQuery(qs({ keyword: long }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("keyword 恰好等于上限 → 放行", () => {
    const edge = "菜".repeat(MAX_KEYWORD_LEN);
    expect(ok(qs({ keyword: edge })).keyword).toBe(edge);
  });
});

describe("parseShopQuery — city 校验", () => {
  it("city 超长 → 400", () => {
    const r = parseShopQuery(
      qs({ keyword: "火锅", city: "城".repeat(MAX_CITY_LEN + 1) }),
    );
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("未传 city → null", () => {
    expect(ok(qs({ keyword: "火锅" })).city).toBeNull();
  });

  it("空白 city → null", () => {
    expect(ok(qs({ keyword: "火锅", city: "  " })).city).toBeNull();
  });

  it("正常 city → trim 后保留", () => {
    expect(ok(qs({ keyword: "火锅", city: " 武汉 " })).city).toBe("武汉");
  });
});

describe("parseShopQuery — 经纬度校验", () => {
  it("经纬度齐全且合法 → useAround=true", () => {
    const r = ok(qs({ keyword: "火锅", lng: "114.4", lat: "30.5" }));
    expect(r.useAround).toBe(true);
    expect(r.lng).toBe("114.4");
    expect(r.lat).toBe("30.5");
  });

  it("只传 lng → 400", () => {
    const r = parseShopQuery(qs({ keyword: "火锅", lng: "114.4" }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("只传 lat → 400", () => {
    const r = parseShopQuery(qs({ keyword: "火锅", lat: "30.5" }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("空串经纬度视作未传 → 走城市搜索，不报错", () => {
    const r = ok(qs({ keyword: "火锅", lng: "", lat: "" }));
    expect(r.useAround).toBe(false);
    expect(r.lng).toBeNull();
    expect(r.lat).toBeNull();
  });

  it("经度越界 → 400", () => {
    const r = parseShopQuery(qs({ keyword: "火锅", lng: "181", lat: "30" }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("纬度越界 → 400", () => {
    const r = parseShopQuery(qs({ keyword: "火锅", lng: "114", lat: "-91" }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("非数字经纬度 → 400", () => {
    const r = parseShopQuery(qs({ keyword: "火锅", lng: "abc", lat: "30" }));
    expect(isQueryError(r) && r.status).toBe(400);
  });

  it("NaN / Infinity 文本 → 400", () => {
    expect(
      isQueryError(parseShopQuery(qs({ keyword: "x", lng: "NaN", lat: "30" }))),
    ).toBe(true);
    expect(
      isQueryError(
        parseShopQuery(qs({ keyword: "x", lng: "Infinity", lat: "30" })),
      ),
    ).toBe(true);
  });

  it("边界值 -180/180/-90/90 放行", () => {
    expect(ok(qs({ keyword: "x", lng: "180", lat: "90" })).useAround).toBe(true);
    expect(ok(qs({ keyword: "x", lng: "-180", lat: "-90" })).useAround).toBe(
      true,
    );
  });
});

describe("parseShopQuery — count 模式", () => {
  it("count=1 → countOnly=true", () => {
    expect(ok(qs({ keyword: "火锅", count: "1" })).countOnly).toBe(true);
  });
  it("count 非 1 → countOnly=false", () => {
    expect(ok(qs({ keyword: "火锅", count: "0" })).countOnly).toBe(false);
    expect(ok(qs({ keyword: "火锅" })).countOnly).toBe(false);
  });
});

describe("fetchWithTimeout", () => {
  it("正常返回时透传 Response、清掉定时器", async () => {
    const fake = new Response("ok");
    const impl = vi.fn().mockResolvedValue(fake);
    const res = await fetchWithTimeout("https://x", {}, 1000, impl);
    expect(res).toBe(fake);
    expect(impl).toHaveBeenCalledOnce();
    // 注入的 fetch 应收到 AbortSignal
    expect(impl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("超时会 abort：signal 变为 aborted", async () => {
    // fetchImpl 永不 resolve，但监听 signal，被 abort 时以 AbortError 拒绝
    const impl = vi.fn(
      (_input: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    await expect(
      fetchWithTimeout("https://x", {}, 5, impl as unknown as typeof fetch),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("传入的 init 会被合并（保留 next.revalidate 等）", async () => {
    const impl = vi.fn().mockResolvedValue(new Response("ok"));
    await fetchWithTimeout(
      "https://x",
      { method: "POST" },
      1000,
      impl,
    );
    expect(impl.mock.calls[0][1].method).toBe("POST");
    expect(impl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
