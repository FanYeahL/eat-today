import { vi } from "vitest";

/** Node 环境模拟浏览器存储；每次测试独立，结束后由调用者 unstubAllGlobals。 */
export function mockStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => values.clear()),
  };
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", storage);
  return storage;
}
