import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readUiStyle,
  writeUiStyle,
  UI_STYLE_KEY,
  UI_STYLE_ROUTES,
  DEFAULT_UI_STYLE,
} from "@/lib/ui-style";

/** 内存版 localStorage（node 环境无 DOM，手搓一个够用的桩）。 */
function makeStorageStub() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe("ui-style", () => {
  afterEach(() => {
    // 清掉每个用例注入的 window，互不污染。
    delete (globalThis as { window?: unknown }).window;
  });

  it("路由映射：classic→/water-concept，menu→/picker", () => {
    expect(UI_STYLE_ROUTES.classic).toBe("/water-concept");
    expect(UI_STYLE_ROUTES.menu).toBe("/picker");
  });

  it("默认风格为 menu（首次访问进新版）", () => {
    expect(DEFAULT_UI_STYLE).toBe("menu");
  });

  describe("有 storage 时", () => {
    let storage: ReturnType<typeof makeStorageStub>;
    beforeEach(() => {
      storage = makeStorageStub();
      (globalThis as { window?: unknown }).window = { localStorage: storage };
    });

    it("无记录 → 返回 null（交由调用方回落默认）", () => {
      expect(readUiStyle()).toBeNull();
    });

    it("写入后可读回，刷新语义（同 key）保留", () => {
      writeUiStyle("classic");
      expect(storage.getItem(UI_STYLE_KEY)).toBe("classic");
      expect(readUiStyle()).toBe("classic");

      writeUiStyle("menu");
      expect(readUiStyle()).toBe("menu");
    });

    it("非法值 → 视为无记录", () => {
      storage.setItem(UI_STYLE_KEY, "bogus");
      expect(readUiStyle()).toBeNull();
    });
  });

  it("无 window（SSR）时 read 返回 null、write 不抛错", () => {
    expect(readUiStyle()).toBeNull();
    expect(() => writeUiStyle("menu")).not.toThrow();
  });

  it("storage 抛错（隐私模式）时 read 回落 null、write 静默", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(readUiStyle()).toBeNull();
    expect(() => writeUiStyle("classic")).not.toThrow();
  });
});
