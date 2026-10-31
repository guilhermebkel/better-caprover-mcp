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
