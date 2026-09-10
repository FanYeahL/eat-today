import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
vi.mock("node:child_process", () => ({ execSync: vi.fn() }));
beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`exit:${code}`);
  });
});
afterEach(() => vi.restoreAllMocks());
it.each([
  { error: { summary: "network unavailable" } },
  {},
  { vulnerabilities: {} },
])("rejects incomplete or failed audit reports", async (report) => {
  vi.mocked(execSync).mockReturnValue(JSON.stringify(report));
  await expect(import("../../scripts/audit-ci.mjs")).rejects.toThrow("exit:1");
});
it("accepts a complete clean report", async () => {
  vi.mocked(execSync).mockReturnValue(
    JSON.stringify({
      vulnerabilities: {},
      metadata: {
        vulnerabilities: {
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
          total: 0,
        },
      },
    }),
  );
  await import("../../scripts/audit-ci.mjs");
  expect(process.exit).not.toHaveBeenCalled();
});
