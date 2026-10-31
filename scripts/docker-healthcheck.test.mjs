import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HttpModeMarker } from "@/Server/HttpModeMarker.ts";

const TEST_MARKER_PATH = `/tmp/better-caprover-mcp-http.test-${process.pid}.active`;

const runHealthcheck = (env = process.env) => spawnSync("sh", ["scripts/docker-healthcheck.sh"], {
  encoding: "utf8",
  env: { ...env, CAPROVER_MCP_HTTP_MARKER_PATH: TEST_MARKER_PATH },
});

describe("scripts/docker-healthcheck.sh", () => {
  beforeEach(() => {
    HttpModeMarker.clearHttpModeMarker(TEST_MARKER_PATH);
  });

  afterEach(() => {
    HttpModeMarker.clearHttpModeMarker(TEST_MARKER_PATH);
  });

  it("exits 0 without the HTTP marker", () => {
    const run = runHealthcheck();
    expect(run.status).toBe(0);
  });

  it("exits 1 when the marker exists but health does not answer ok", () => {
    HttpModeMarker.markHttpModeActive(TEST_MARKER_PATH);
    const run = runHealthcheck({ ...process.env, CAPROVER_MCP_HTTP_PORT: "31999" });
    expect(run.status).toBe(1);
  });
});
