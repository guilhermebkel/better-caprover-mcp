import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const INSTALL_MARKER_PATHS = ["node_modules/.modules.yaml", "node_modules/.pnpm/lock.yaml"];
export const LOCK_INPUT_PATHS = ["package.json", "pnpm-lock.yaml"];

export const getLatestMtimeMs = (paths, { exists = existsSync, stat = statSync } = {}) => {
  let latest = 0;
  for (const path of paths) {
    if (!exists(path)) {
      continue;
    }
    latest = Math.max(latest, stat(path).mtimeMs);
  }
  return latest;
};

export const getInstallMarkerMtimeMs = ({ exists = existsSync, stat = statSync } = {}) => {
  for (const path of INSTALL_MARKER_PATHS) {
    if (exists(path)) {
      return stat(path).mtimeMs;
    }
  }
  return null;
};

export const isDepsUpToDate = ({ exists = existsSync, stat = statSync } = {}) => {
  if (!exists("node_modules")) {
    return false;
  }
  const markerMs = getInstallMarkerMtimeMs({ exists, stat });
  if (markerMs === null) {
    return false;
  }
  const lockMs = getLatestMtimeMs(LOCK_INPUT_PATHS, { exists, stat });
  return lockMs <= markerMs;
};

const runPnpmInstall = ({ spawn = (args) => spawnSync("pnpm", args, { stdio: "inherit" }) } = {}) => {
  const result = spawn(["install"]);
  return result.status ?? 1;
};

export const ensureDeps = ({ isUpToDate = isDepsUpToDate, install = runPnpmInstall } = {}) => {
  if (isUpToDate()) {
    return 0;
  }
  return install();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(ensureDeps());
}
