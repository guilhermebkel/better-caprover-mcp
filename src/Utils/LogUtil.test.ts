import { afterEach, describe, expect, it, vi } from "vitest";
import { LogUtil } from "@/Utils/LogUtil.ts";

describe("LogUtil.logInfo()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one JSON line to stderr and nothing to stdout", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    LogUtil.logInfo("server_started");

    expect(stderr).toHaveBeenCalledExactlyOnceWith("{\"level\":\"info\",\"event\":\"server_started\"}\n");
    expect(stdout).not.toHaveBeenCalled();
  });
});

describe("LogUtil.logError()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the event and its detail to stderr", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    LogUtil.logError("startup_failed", "bad mode");

    expect(stderr).toHaveBeenCalledExactlyOnceWith("{\"level\":\"error\",\"event\":\"startup_failed\",\"detail\":\"bad mode\"}\n");
  });
});

describe("LogUtil.logAudit()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one JSON audit line to stderr with ISO time from atMs", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    LogUtil.logAudit({ tool: "list_apps", risk: "read", result: "ok", atMs: 0 });

    expect(stderr).toHaveBeenCalledExactlyOnceWith(
      "{\"level\":\"audit\",\"time\":\"1970-01-01T00:00:00.000Z\",\"tool\":\"list_apps\",\"risk\":\"read\",\"result\":\"ok\"}\n",
    );
  });
});

describe("LogUtil.setLevel()", () => {
  afterEach(() => {
    LogUtil.setLevel("info");
    vi.restoreAllMocks();
  });

  it("writes debug lines with their fields only when the level is debug", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    LogUtil.setLevel("debug");
    LogUtil.logDebug("config_loaded", { transport: "http", httpPort: 3100 });

    expect(stderr).toHaveBeenCalledExactlyOnceWith("{\"level\":\"debug\",\"event\":\"config_loaded\",\"transport\":\"http\",\"httpPort\":3100}\n");
  });

  it("drops debug lines at the default info level", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    LogUtil.logDebug("config_loaded", { transport: "http" });

    expect(stderr).not.toHaveBeenCalled();
  });

  it("keeps errors and audit lines at the error level", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    LogUtil.setLevel("error");
    LogUtil.logInfo("server_started");
    LogUtil.logError("startup_failed", "bad mode");
    LogUtil.logAudit({ tool: "list_apps", risk: "read", result: "ok", atMs: 0 });

    expect(stderr).toHaveBeenCalledTimes(2);
    expect(stderr.mock.calls[0]?.[0]).toBe("{\"level\":\"error\",\"event\":\"startup_failed\",\"detail\":\"bad mode\"}\n");
    expect(stderr.mock.calls[1]?.[0]).toContain("\"level\":\"audit\"");
  });
});
