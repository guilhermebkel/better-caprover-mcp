import { describe, it, expect, vi } from "vitest";
import { filterSourcePaths, runRelatedTests, runTestChanged } from "./test-changed.mjs";

const TIME_UTIL = "src/Utils/TimeUtil.ts";
const SUCCESS = { status: 0 };

describe("filterSourcePaths()", () => {
  it("keeps TypeScript and mjs files and drops everything else", () => {
    expect(filterSourcePaths([TIME_UTIL, "README.md", "scripts/lint.mjs", "src/Surfaces/ServerSurface.ts"])).toStrictEqual([
      TIME_UTIL,
      "scripts/lint.mjs",
      "src/Surfaces/ServerSurface.ts",
    ]);
  });
});

describe("runRelatedTests()", () => {
  it("runs vitest related on the given paths", () => {
    const spawn = vi.fn(() => SUCCESS);

    expect(runRelatedTests([TIME_UTIL], { spawn })).toBe(0);
    expect(spawn).toHaveBeenCalledWith(["exec", "vitest", "related", "--run", "--passWithNoTests", TIME_UTIL]);
  });

  it("returns 0 when there are no paths", () => {
    const spawn = vi.fn();

    expect(runRelatedTests([], { spawn })).toBe(0);
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe("runTestChanged()", () => {
  it("runs related tests for changed source files", () => {
    const spawn = vi.fn(() => SUCCESS);
    const readPaths = () => ({ base: "abc", changedPaths: [TIME_UTIL, "AGENTS.md"] });

    expect(runTestChanged({ readPaths, spawn })).toBe(0);
    expect(spawn).toHaveBeenCalledWith(["exec", "vitest", "related", "--run", "--passWithNoTests", TIME_UTIL]);
  });

  it("returns 0 when nothing source-like changed", () => {
    const spawn = vi.fn();
    const readPaths = () => ({ base: "abc", changedPaths: ["AGENTS.md"] });

    expect(runTestChanged({ readPaths, spawn })).toBe(0);
    expect(spawn).not.toHaveBeenCalled();
  });
});
