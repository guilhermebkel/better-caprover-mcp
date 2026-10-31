import { describe, it, expect, vi } from "vitest";
import { ensureDeps, getInstallMarkerMtimeMs, getLatestMtimeMs, isDepsUpToDate } from "./ensure-deps.mjs";

const MODULES_YAML = "node_modules/.modules.yaml";
const LOCKFILE = "pnpm-lock.yaml";
const PACKAGE_JSON = "package.json";
const NODE_MODULES = "node_modules";

describe("getInstallMarkerMtimeMs()", () => {
  it("uses the first marker path that exists", () => {
    const hasPath = (path) => path === MODULES_YAML;
    const readMtimeMs = () => ({ mtimeMs: 100 });

    expect(getInstallMarkerMtimeMs({ exists: hasPath, stat: readMtimeMs })).toBe(100);
  });

  it("returns null when no marker exists", () => {
    expect(getInstallMarkerMtimeMs({ exists: () => false, stat: vi.fn() })).toBeNull();
  });
});

describe("getLatestMtimeMs()", () => {
  it("returns the newest mtime among the paths that exist", () => {
    const pathToMtimeMs = { [PACKAGE_JSON]: 100, [LOCKFILE]: 200 };
    const hasPath = (path) => Object.hasOwn(pathToMtimeMs, path);
    const readMtimeMs = (path) => ({ mtimeMs: pathToMtimeMs[path] });

    expect(getLatestMtimeMs([PACKAGE_JSON, LOCKFILE], { exists: hasPath, stat: readMtimeMs })).toBe(200);
  });
});

describe("isDepsUpToDate()", () => {
  it("is false when node_modules is missing", () => {
    expect(isDepsUpToDate({ exists: () => false, stat: vi.fn() })).toBe(false);
  });

  it("is false when node_modules exists but no install marker does", () => {
    const hasPath = (path) => path === NODE_MODULES;
    expect(isDepsUpToDate({ exists: hasPath, stat: vi.fn() })).toBe(false);
  });

  it("is false when the lockfile is newer than the install marker", () => {
    const pathToMtimeMs = {
      [NODE_MODULES]: 1,
      [MODULES_YAML]: 100,
      [LOCKFILE]: 200,
      [PACKAGE_JSON]: 50,
    };
    const hasPath = (path) => Object.hasOwn(pathToMtimeMs, path);
    const readMtimeMs = (path) => ({ mtimeMs: pathToMtimeMs[path] });

    expect(isDepsUpToDate({ exists: hasPath, stat: readMtimeMs })).toBe(false);
  });

  it("is true when the install marker is at least as new as package.json and the lockfile", () => {
    const pathToMtimeMs = {
      [NODE_MODULES]: 1,
      [MODULES_YAML]: 300,
      [LOCKFILE]: 200,
      [PACKAGE_JSON]: 150,
    };
    const hasPath = (path) => Object.hasOwn(pathToMtimeMs, path);
    const readMtimeMs = (path) => ({ mtimeMs: pathToMtimeMs[path] });

    expect(isDepsUpToDate({ exists: hasPath, stat: readMtimeMs })).toBe(true);
  });
});

describe("ensureDeps()", () => {
  it("returns 0 without installing when dependencies are up to date", () => {
    const install = vi.fn();
    const result = ensureDeps({ isUpToDate: () => true, install });

    expect(result).toBe(0);
    expect(install).not.toHaveBeenCalled();
  });

  it("installs when dependencies are not up to date", () => {
    const install = vi.fn(() => 0);
    const result = ensureDeps({ isUpToDate: () => false, install });

    expect(result).toBe(0);
    expect(install).toHaveBeenCalledOnce();
  });
});
