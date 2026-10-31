import { spawn, spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockCaproverRouteBuilder } from "@/Adapters/CapRover/MockCaproverRouteBuilder.ts";
import { MockCaproverServer } from "@/Adapters/CapRover/MockCaproverServer.ts";
import { HttpModeMarkerUtil } from "@/Server/HttpModeMarkerUtil.ts";
import { HttpRunner } from "@/Server/HttpRunner.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { waitForDockerHealthy } from "./package-smoke.mjs";

const TEST_MARKER_PATH = `/tmp/better-caprover-mcp-http.test-${process.pid}.active`;
const FAKE_PASSWORD = "fake-password-9876";
const HEALTHCHECK_HTTP_PORT = String(33_000 + (process.pid % 10_000));

const HEALTHCHECK_SCRIPT = "scripts/docker-healthcheck.sh";

const runHealthcheck = (env = process.env) => spawnSync("sh", [HEALTHCHECK_SCRIPT], {
  encoding: "utf8",
  env: { ...env, CAPROVER_MCP_HTTP_MARKER_PATH: TEST_MARKER_PATH },
});

const runHealthcheckAsync = (env = process.env) => new Promise((resolve, reject) => {
  const child = spawn("sh", [HEALTHCHECK_SCRIPT], {
    env: { ...env, CAPROVER_MCP_HTTP_MARKER_PATH: TEST_MARKER_PATH },
  });
  child.on("error", reject);
  child.on("close", (status) => {
    resolve({ status: status ?? 1 });
  });
});

describe("scripts/docker-healthcheck.sh", () => {
  beforeEach(() => {
    HttpModeMarkerUtil.clearHttpModeMarker(TEST_MARKER_PATH);
  });

  afterEach(() => {
    HttpModeMarkerUtil.clearHttpModeMarker(TEST_MARKER_PATH);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("exits 0 without the HTTP marker", () => {
    const run = runHealthcheck();
    expect(run.status).toBe(0);
  });

  it("exits 1 when the marker exists but health does not answer ok", () => {
    HttpModeMarkerUtil.markHttpModeActive(TEST_MARKER_PATH);
    const run = runHealthcheck({ ...process.env, CAPROVER_MCP_HTTP_PORT: "31999" });
    expect(run.status).toBe(1);
  });

  it("exits 0 when the marker exists and health returns ok", async () => {
    const mock = new MockCaproverServer(MockCaproverRouteBuilder.buildDefault());
    const captainUrl = await mock.start();
    vi.stubEnv("CAPROVER_MCP_MODE", "readonly");
    vi.stubEnv("CAPROVER_MCP_HTTP_HOST", "127.0.0.1");
    vi.stubEnv("CAPROVER_MCP_HTTP_PORT", HEALTHCHECK_HTTP_PORT);
    vi.stubEnv("CAPROVER_URL", captainUrl);
    vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);
    const env = EnvUtil.read();
    const handle = await HttpRunner.start(env, { httpMarkerPath: TEST_MARKER_PATH });
    try {
      const port = new URL(handle.url).port;
      const run = await runHealthcheckAsync({ ...process.env, CAPROVER_MCP_HTTP_PORT: port });
      expect(run.status).toBe(0);
    } finally {
      await handle.close();
      await mock.stop();
    }
  });
});

describe("waitForDockerHealthy()", () => {
  it("returns when docker inspect reports healthy", async () => {
    const spawnSyncKeyToResult = {
      "docker:ps": { stdout: "container-id\n", stderr: "", status: 0 },
      "docker:inspect": { stdout: "healthy\n", stderr: "", status: 0 },
    };
    const buildMockSpawnSync = () => (command, args) => {
      const key = `${command}:${args[0]}`;
      return spawnSyncKeyToResult[key] ?? { stdout: "", stderr: "", status: 1 };
    };
    const spawnSyncFn = buildMockSpawnSync();
    await expect(waitForDockerHealthy("ghcr.io/example/image:tag", spawnSyncFn)).resolves.toBeUndefined();
  });
});
