import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureDeps } from "./ensure-deps.mjs";

const BASE_REF = "origin/main";

// Why: a change here can break any file, so the changed-files run proves nothing and the full check runs.
const SHARED_ROOT_PREFIXES = ["tsconfig", "lint-staged.config", "scripts/", "src/Protocols/", ".github/", "Dockerfile"];
const SHARED_ROOT_FILES = new Set(["package.json", "pnpm-lock.yaml", "eslint.config.mjs", ".oxlintrc.json", "vitest.config.mjs", "tsup.config.ts", "knip.json", ".jscpd.json"]);

export const isSharedRoot = (path) => {
  return SHARED_ROOT_FILES.has(path) || SHARED_ROOT_PREFIXES.some((prefix) => path.startsWith(prefix));
};

export const planCheck = ({ base, changedPaths }) => {
  if (base === null) {
    return { kind: "full", reason: `${BASE_REF} could not be resolved` };
  }
  const sharedRoot = changedPaths.find(isSharedRoot);
  if (sharedRoot !== undefined) {
    return { kind: "full", reason: `${sharedRoot} is a shared root` };
  }
  return { kind: "changed", base };
};

const runGit = (args) => {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
};

const readGitLines = (text) => {
  return text === "" ? [] : text.split("\n");
};

const resolveBase = () => {
  try {
    return runGit(["merge-base", BASE_REF, "HEAD"]);
  } catch {
    return null;
  }
};

const stageNewFiles = () => {
  const untracked = readGitLines(runGit(["ls-files", "--others", "--exclude-standard"]));
  // Why: `git diff <base>` lists a new file only once it is in the index, and lint-staged refuses files marked with `--intent-to-add`.
  if (untracked.length > 0) {
    execFileSync("git", ["add", "--", ...untracked]);
  }
};

export const readChangedPaths = () => {
  const base = resolveBase();
  if (base === null) {
    return { base: null, changedPaths: [] };
  }
  stageNewFiles();
  const changedPaths = readGitLines(runGit(["diff", "--name-only", base]));
  return { base, changedPaths };
};

const run = (command, args) => {
  return spawnSync(command, args, { stdio: "inherit" }).status ?? 1;
};

const runChecks = () => {
  const depsStatus = ensureDeps();
  if (depsStatus !== 0) {
    return depsStatus;
  }
  const { base, changedPaths } = readChangedPaths();
  const plan = planCheck({ base, changedPaths });

  if (plan.kind === "full") {
    process.stdout.write(`Running the full pnpm check: ${plan.reason}.\n`);
    return run("pnpm", ["check"]);
  }
  if (changedPaths.length === 0) {
    process.stdout.write("Nothing changed since the base; nothing to check.\n");
    return 0;
  }
  return run("pnpm", ["lint-staged", "--diff", plan.base, "--concurrent", "false"]);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runChecks());
}
