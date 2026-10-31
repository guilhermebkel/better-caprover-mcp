import { afterEach, describe, expect, it, vi } from "vitest";
import { MockCaproverRouteBuilder } from "@/Adapters/CapRover/MockCaproverRouteBuilder.ts";
import { MockCaproverServer } from "@/Adapters/CapRover/MockCaproverServer.ts";
import { HealthRunner } from "@/Server/HealthRunner.ts";
import { HttpRunner } from "@/Server/HttpRunner.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { FreePortUtil } from "@/Utils/FreePortUtil.ts";
import { HttpModeMarkerUtil } from "@/Utils/HttpModeMarkerUtil.ts";

const MARKER_PATH = `/tmp/better-caprover-mcp-http.health-test-${process.pid}.active`;
const FAKE_PASSWORD = "fake-password-9876";

const readEnv = (port: number, captainUrl: string): ReturnType<typeof EnvUtil.read> => {
  vi.stubEnv("CAPROVER_MCP_MODE", "readonly");
  vi.stubEnv("CAPROVER_MCP_HTTP_HOST", "127.0.0.1");
  vi.stubEnv("CAPROVER_MCP_HTTP_PORT", String(port));
  vi.stubEnv("CAPROVER_URL", captainUrl);
  vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);
  return EnvUtil.read();
};

afterEach(() => {
  HttpModeMarkerUtil.clearHttpModeMarker(MARKER_PATH);
  vi.unstubAllEnvs();
});

describe("HealthRunner.check()", () => {
  it("is healthy without the HTTP marker (stdio)", async () => {
    const env = readEnv(await FreePortUtil.find(), "http://127.0.0.1:1");
    await expect(HealthRunner.check(env, MARKER_PATH)).resolves.toBe(true);
  });

  it("is unhealthy when the marker exists and nothing answers", async () => {
    HttpModeMarkerUtil.markHttpModeActive(MARKER_PATH);
    const env = readEnv(await FreePortUtil.find(), "http://127.0.0.1:1");
    await expect(HealthRunner.check(env, MARKER_PATH)).resolves.toBe(false);
  });

  it("is healthy when the marker exists and /health answers ok", async () => {
    const mock = new MockCaproverServer(MockCaproverRouteBuilder.buildDefault());
    const captainUrl = await mock.start();
    const env = readEnv(await FreePortUtil.find(), captainUrl);
    const handle = await HttpRunner.start(env, { httpMarkerPath: MARKER_PATH });
    try {
      await expect(HealthRunner.check(env, MARKER_PATH)).resolves.toBe(true);
    } finally {
      await handle.close();
      await mock.stop();
    }
  });
});
