import { describe, it, expect } from "vitest";
import { isSharedRoot, planCheck } from "./check-changed.mjs";

describe("planCheck()", () => {
  it("checks only the changed files when nothing shared changed", () => {
    expect(planCheck({ base: "abc", changedPaths: ["src/Utils/TimeUtil.ts", "src/Services/ModeService.ts"] })).toStrictEqual({ kind: "changed", base: "abc" });
  });

  it("runs the full check and says why when the base cannot be resolved", () => {
    expect(planCheck({ base: null, changedPaths: [] })).toStrictEqual({ kind: "full", reason: "origin/main could not be resolved" });
  });

  it.each(["package.json", "pnpm-lock.yaml", "tsconfig.json", "eslint.config.mjs", ".oxlintrc.json", "vitest.config.mjs", "tsup.config.ts", "lint-staged.config.mjs", "scripts/package-smoke.mjs", "src/Protocols/EnvProtocol.ts", "Dockerfile", ".github/workflows/ci.yml"])(
    "runs the full check when %s changed",
    (path) => {
      expect(planCheck({ base: "abc", changedPaths: ["src/Utils/TimeUtil.ts", path] })).toStrictEqual({ kind: "full", reason: `${path} is a shared root` });
    },
  );
});

describe("isSharedRoot()", () => {
  it("leaves ordinary source files out", () => {
    expect(isSharedRoot("src/Protocolsish.ts")).toBe(false);
    expect(isSharedRoot("src/Utils/package.json.ts")).toBe(false);
  });
});
