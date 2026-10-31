import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import { HttpRunner } from "@/Server/HttpRunner.ts";
import { EnvTestUtil } from "@/Utils/EnvTestUtil.ts";

describe("HttpRunner.assertBindAllowed()", () => {
  it("refuses a public bind without CAPROVER_MCP_HTTP_TOKENS", () => {
    const env = EnvTestUtil.build({ CAPROVER_MCP_HTTP_HOST: "0.0.0.0" });

    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).toThrow(HttpBindForbiddenError);
    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).toThrow(/CAPROVER_MCP_HTTP_TOKENS/);
  });

  it("allows localhost without tokens", () => {
    const env = EnvTestUtil.build({ CAPROVER_MCP_HTTP_HOST: "127.0.0.1" });

    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).not.toThrow();
  });
});

describe("HttpRunner.start()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 for a request without a bearer token", async () => {
    vi.stubEnv("CAPROVER_MCP_HTTP_TOKENS", JSON.stringify({ cursor: "test-token-12345678" }));
    const handle = await HttpRunner.start(EnvTestUtil.build({ CAPROVER_MCP_HTTP_TOKENS: { cursor: "test-token-12345678" } }));
    try {
      const response = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}" });
      expect(response.status).toBe(401);
      const body = await response.text();
      expect(body).toBe("Unauthorized");
    } finally {
      await handle.close();
    }
  });

  it("answers health checks without auth", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build());
    try {
      const response = await fetch(`${handle.url}/health`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toBe("ok");
    } finally {
      await handle.close();
    }
  });
});
