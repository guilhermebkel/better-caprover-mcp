import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readChangedPaths } from "./check-changed.mjs";

const SOURCE_PATTERN = /\.(?:ts|tsx|mjs)$/u;

export const filterSourcePaths = (paths) => paths.filter((path) => SOURCE_PATTERN.test(path));

export const runRelatedTests = (paths, { spawn = (args) => spawnSync("pnpm", args, { stdio: "inherit" }) } = {}) => {
  if (paths.length === 0) {
    return 0;
  }
  const result = spawn(["exec", "vitest", "related", "--run", "--passWithNoTests", ...paths]);
  return result.status ?? 1;
};

export const runTestChanged = ({ readPaths = readChangedPaths, spawn } = {}) => {
  const { changedPaths } = readPaths();
  const sources = filterSourcePaths(changedPaths);
  if (sources.length === 0) {
    process.stdout.write("No changed source files; nothing to test.\n");
    return 0;
  }
  return runRelatedTests(sources, { spawn });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runTestChanged());
}
