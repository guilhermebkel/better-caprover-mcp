import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";
import { StartupLogUtil } from "@/Utils/StartupLogUtil.ts";

const FAKE_PASSWORD = "fake-password-7731";
const FAKE_TOKEN = "fake-token-4418";

const ENV: Env = {
  CAPROVER_MCP_MODE: "operate",
  CAPROVER_MCP_ALLOW_CRITICAL: false,
  CAPROVER_MCP_TOOLSETS: ["core", "apps", "domains", "oneclick"],
  CAPROVER_MCP_TRANSPORT: "http",
  CAPROVER_MCP_LOG_LEVEL: "debug",
  CAPROVER_URL: "https://captain.example.com",
  CAPROVER_PASSWORD: FAKE_PASSWORD,
  CAPROVER_MCP_HTTP_HOST: "127.0.0.1",
  CAPROVER_MCP_HTTP_PORT: 3100,
  CAPROVER_MCP_HTTP_TOKEN: FAKE_TOKEN,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: 1_048_576,
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: 120,
  CAPROVER_MCP_MAX_HTTP_SESSIONS: 64,
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: 86_400_000,
  CAPROVER_MCP_MAX_CONCURRENT: 5,
};

describe("StartupLogUtil.logServerStarted()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the start at info with what was set, not the values", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    StartupLogUtil.logServerStarted(ENV, "http");

    expect(stderr).toHaveBeenCalledExactlyOnceWith(
      "{\"level\":\"info\",\"event\":\"server_started\",\"transport\":\"http\",\"mode\":\"operate\",\"allowCritical\":false,\"capRoverUrlSet\":true,\"capRoverPasswordSet\":true}\n",
    );
  });
});

describe("StartupLogUtil.startLogging()", () => {
  afterEach(() => {
    LogUtil.setLevel("info");
    vi.restoreAllMocks();
  });

  it("logs the configuration at debug without the password or the token", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    StartupLogUtil.startLogging(ENV, "http");

    const output = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("\"event\":\"config_loaded\"");
    expect(output).toContain("\"capRoverOrigin\":\"https://captain.example.com\"");
    expect(output).toContain("\"httpTokenSet\":true");
    expect(output).not.toContain(FAKE_PASSWORD);
    expect(output).not.toContain(FAKE_TOKEN);
  });

  it("drops that configuration when the level is info", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    StartupLogUtil.startLogging({ ...ENV, CAPROVER_MCP_LOG_LEVEL: "info" }, "stdio");

    expect(stderr).not.toHaveBeenCalled();
  });
});
