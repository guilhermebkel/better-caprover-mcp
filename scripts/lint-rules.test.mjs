import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ESLint } from "eslint";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const WORK_DIR = mkdtempSync(join(ROOT, "lint-fixtures-"));
const MINUTE_MS = 60_000;
const CONFIG_FILE = ".oxlintrc.json";
const LOCAL_PLUGIN = "./scripts/eslint-local-rules.mjs";
const SERVICE_FILE = "src/Services/ModeService.ts";
const NO_RESTRICTED_IMPORTS = "eslint(no-restricted-imports)";
const NO_RESTRICTED_PROPERTIES = "eslint(no-restricted-properties)";

const writeConfig = () => {
  const configText = readFileSync(join(ROOT, CONFIG_FILE), "utf8");
  const config = JSON.parse(configText);
  const localPluginPath = join(ROOT, LOCAL_PLUGIN);
  // Why: the fixtures sit in a throwaway folder inside the repo (so the JS plugins resolve) and are deleted after the run; the config copy needs the local plugin path made absolute.
  config.jsPlugins = config.jsPlugins.map((plugin) => plugin === LOCAL_PLUGIN ? localPluginPath : plugin);
  writeFileSync(join(WORK_DIR, CONFIG_FILE), JSON.stringify(config));
};

const writeFixture = (path, code) => {
  const file = join(WORK_DIR, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, code);
};

const runOxlint = (path) => {
  const configPath = join(WORK_DIR, CONFIG_FILE);
  const filePath = join(WORK_DIR, path);
  const args = ["exec", "oxlint", "--type-aware", "-c", configPath, "--format", "json", filePath];
  const result = spawnSync("pnpm", args, { cwd: ROOT, encoding: "utf8" });
  const report = JSON.parse(result.stdout);
  return report.diagnostics.map((diagnostic) => diagnostic.code);
};

writeConfig();
afterAll(() => {
  rmSync(WORK_DIR, { recursive: true, force: true });
});

// Why: each row is a file that breaks one rule that guards privacy, permissions, the user filter or a layer, the path it sits at, and the rule id Oxlint names.
const FAILING_EXAMPLES = [
  ["process.env outside EnvUtil", SERVICE_FILE, "export const read = () => process.env.SECRET;\n", NO_RESTRICTED_PROPERTIES],
  ["process.stdout in server code", SERVICE_FILE, "export const write = () => process.stdout.write(\"x\");\n", NO_RESTRICTED_PROPERTIES],
  ["the MCP SDK outside Server and Surfaces", SERVICE_FILE, "import { Server } from \"@modelcontextprotocol/sdk/server/index.js\";\nexport const make = Server;\n", NO_RESTRICTED_IMPORTS],
  ["the CapRover SDK outside its adapter", SERVICE_FILE, "import CapRoverAPI from \"caprover-api\";\nexport const make = CapRoverAPI;\n", NO_RESTRICTED_IMPORTS],
  ["the sandbox engine outside its adapter", SERVICE_FILE, "import { getQuickJS } from \"quickjs-emscripten\";\nexport const make = getQuickJS;\n", NO_RESTRICTED_IMPORTS],
  ["a child process in server code", SERVICE_FILE, "import { spawn } from \"node:child_process\";\nexport const run = spawn;\n", NO_RESTRICTED_IMPORTS],
  ["a layer that imports a higher layer", "src/Utils/TimeUtil.ts", "import { ModeService } from \"@/Services/ModeService.ts\";\nexport const make = ModeService;\n", NO_RESTRICTED_IMPORTS],
  ["console in production code", SERVICE_FILE, "export const log = () => { console.log(\"x\"); };\n", "eslint(no-console)"],
  ["a vitest matcher that asserts nothing exact", "src/Utils/TimeUtil.test.ts", "import { expect, it } from \"vitest\";\nit(\"a\", () => { expect(1).toBeTruthy(); });\n", "vitest(no-restricted-matchers)"],
  ["a floating promise", SERVICE_FILE, "export const run = async () => { Promise.resolve(1); };\n", "typescript(no-floating-promises)"],
];

describe("pnpm lint, Oxlint side", () => {
  it.each(FAILING_EXAMPLES)("%s fails with the name of the rule", (_name, path, code, ruleId) => {
    writeFixture(path, code);
    const codes = runOxlint(path);
    expect(codes).toContain(ruleId);
  }, MINUTE_MS);

  it("a clean file passes", () => {
    writeFixture("src/Services/CleanService.ts", "export const ONE = 1;\n");
    const codes = runOxlint("src/Services/CleanService.ts");
    expect(codes).toStrictEqual([]);
  }, MINUTE_MS);
});

// Why: the ESLint project service only lints files the TypeScript project knows, so these examples use files that exist.
const EXISTING_SOURCE_FILE = "src/Utils/EnvUtil.ts";

const eslint = new ESLint({ cwd: ROOT });

const runEslint = async (path, code) => {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, path) });
  return result.messages.map((message) => message.ruleId);
};

// Why: each row is a rule Oxlint cannot run (or runs differently), so ESLint keeps it and `pnpm lint` fails if either linter fails.
const ESLINT_EXAMPLES = [
  ["a boolean named without a prefix", EXISTING_SOURCE_FILE, "export const done = true;\nexport const check = (ready: boolean) => ready;\n", "@typescript-eslint/naming-convention"],
  ["a type that cannot be false", EXISTING_SOURCE_FILE, "export const check = (value: string) => value === \"a\" || value !== undefined;\n", "@typescript-eslint/no-unnecessary-condition"],
  ["a call nested three deep", EXISTING_SOURCE_FILE, "export const run = () => a(b(1, 2, 3), 2, 3);\n", "no-restricted-syntax"],
  ["a one-letter name", EXISTING_SOURCE_FILE, "export const run = (x: string) => x;\n", "id-length"],
  ["a condition inside a test", "src/Utils/EnvUtil.test.ts", "import { expect, it } from \"vitest\";\nit(\"a\", () => { if (Math.random() > 1) { expect(1).toBe(1); } });\n", "vitest/no-conditional-in-test"],
];

describe("pnpm lint, ESLint side", () => {
  it.each(ESLINT_EXAMPLES)("%s fails with the name of the rule", async (_name, path, code, ruleId) => {
    const ruleIds = await runEslint(path, code);
    expect(ruleIds).toContain(ruleId);
  }, MINUTE_MS);
});
