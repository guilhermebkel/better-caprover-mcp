import { describe, it, expect } from "vitest";
import config, { buildQualityCommand, buildLintCommand, buildRelatedTestsCommand, buildTypecheckCommand, buildOperationDocsCommand } from "./lint-staged.config.mjs";

const CWD = process.cwd();
const UTIL = `${CWD}/src/Utils/EnvUtil.ts`;
const UTIL_TEST = `${CWD}/src/Utils/EnvUtil.test.ts`;

describe("lint-staged config", () => {
  it("lints the changed files without --fix", () => {
    expect(buildLintCommand([UTIL, UTIL_TEST])).toBe(`node scripts/lint.mjs --max-warnings=0 "${UTIL}" "${UTIL_TEST}"`);
  });

  it("runs the tests that import the changed files", () => {
    expect(buildRelatedTestsCommand([UTIL])).toBe(`vitest related --run --passWithNoTests "${UTIL}"`);
  });

  it("typechecks the project with no file arguments", () => {
    expect(buildTypecheckCommand()).toBe("tsc --noEmit");
  });

  it("runs the whole-project quality tools once for source changes", () => {
    expect(config["**/*.{ts,mjs}"]).toContain(buildQualityCommand);
  });

  it("keeps the typecheck on typescript files only", () => {
    expect(config["**/*.ts"]).toBe(buildTypecheckCommand);
  });

  it("runs the operation texts check once when operations, the README, AGENTS.md or the site change (AC8)", () => {
    expect(config["{README.md,AGENTS.md,site/**,src/Operations/**}"]).toBe(buildOperationDocsCommand);
    expect(buildOperationDocsCommand()).toBe("pnpm check:operation-docs");
  });
});
