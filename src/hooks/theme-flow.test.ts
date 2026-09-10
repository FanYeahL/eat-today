// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Picker from "@/components/features/picker/UniversalFoodPicker";
import Water from "@/app/water-concept/page";
import { resolveCoords } from "@/lib/geo";
import { getEntries } from "@/lib/diary";

vi.mock("@/lib/geo", async (original) => ({
  ...(await original<typeof import("@/lib/geo")>()),
  resolveCoords: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// jsdom 没有布局引擎，退出动画不参与本测试；真实业务 hook 与水主题 timers 全部保留。
vi.mock("framer-motion", async (original) => ({
  ...(await original<typeof import("framer-motion")>()),
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

const originalScrollTo = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollTo",
);
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 11, 12));
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    })),
  );
  vi.mocked(resolveCoords).mockRejectedValue("timeout");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            shops: [
              {
                id: "shop",
                name: "测试餐馆",
                location: "116,39",
                distance: 240,
                category: null,
              },
            ],
            via: "location",
          }),
        ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalScrollTo)
    Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScrollTo);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
});
async function settle(ms = 2000) {
  // 先提交业务更新，再让真实 motion 的 RAF 和水主题的阶段 timers 推进。
  await act(async () => {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("theme adapters", () => {
  it("picker: choose → result → city recovery → shops → home", async () => {
    render(createElement(Picker));
    fireEvent.click(screen.getByRole("button", { name: "帮我选一个" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /就吃这个.*找店/ }));
    await settle();
    expect(getEntries()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "重试定位" })).toBeTruthy();
    vi.mocked(resolveCoords).mockResolvedValue({ lng: 116, lat: 39 });
    fireEvent.click(screen.getByRole("button", { name: "重试定位" }));
    await settle();
    expect(screen.getByText("测试餐馆")).toBeTruthy();
    expect(getEntries()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /首页/ }));
    await settle();
    expect(screen.getByRole("button", { name: "帮我选一个" })).toBeTruthy();
  });
  it("water: enter → cast → reveal → confirm → location retry → shops", async () => {
    render(createElement(Water));
    fireEvent.click(screen.getByRole("button", { name: /开 始 投 签/ }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /投 签 入 水/ }));
    await settle(4000);
    fireEvent.click(screen.getByRole("button", { name: /定了.*共 1 道/ }));
    await settle();
    expect(getEntries()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "重试定位" })).toBeTruthy();
    vi.mocked(resolveCoords).mockResolvedValue({ lng: 116, lat: 39 });
    fireEvent.click(screen.getByRole("button", { name: "重试定位" }));
    await settle();
    expect(screen.getByText("测试餐馆")).toBeTruthy();
    expect(getEntries()).toHaveLength(1);
  });
});
