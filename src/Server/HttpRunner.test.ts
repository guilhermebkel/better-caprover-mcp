import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import { HttpRunner } from "@/Server/HttpRunner.ts";
import { EnvTestUtil } from "@/Utils/EnvTestUtil.ts";

const TEST_TOKEN = "test-token-12345678";
const WRONG_TOKEN = "wrong-token-123456789";

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

  it("returns 401 for MCP on localhost when no bearer token is configured", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build());
    try {
      const response = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}" });
      expect(response.status).toBe(401);
    } finally {
      await handle.close();
    }
  });

  it("returns 401 for a request with the wrong bearer token and runs no tools", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build({ CAPROVER_MCP_HTTP_TOKENS: { cursor: TEST_TOKEN } }));
    try {
      const response = await fetch(`${handle.url}/mcp`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${WRONG_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_overview", arguments: {} },
        }),
      });
      expect(response.status).toBe(401);
      const body = await response.text();
      expect(body).toBe("Unauthorized");
      expect(body).not.toContain(TEST_TOKEN);
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

  it("returns 413 for an oversized body", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build({
      CAPROVER_MCP_HTTP_TOKENS: { cursor: TEST_TOKEN },
      CAPROVER_MCP_MAX_HTTP_BODY_BYTES: 32,
    }));
    try {
      const response = await fetch(`${handle.url}/mcp`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${TEST_TOKEN}`, "Content-Type": "application/json" },
        body: `{"jsonrpc":"2.0","id":1,"method":"initialize","params":${"x".repeat(64)}}`,
      });
      expect(response.status).toBe(413);
    } finally {
      await handle.close();
    }
  });

  it("returns 400 for invalid JSON", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build({ CAPROVER_MCP_HTTP_TOKENS: { cursor: TEST_TOKEN } }));
    try {
      const response = await fetch(`${handle.url}/mcp`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${TEST_TOKEN}`, "Content-Type": "application/json" },
        body: "{not-json",
      });
      expect(response.status).toBe(400);
    } finally {
      await handle.close();
    }
  });

  it("lets two clients initialize separate sessions", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build({ CAPROVER_MCP_HTTP_TOKENS: { cursor: TEST_TOKEN } }));
    try {
      const connectClient = async (name: string): Promise<Client> => {
        const transport = new StreamableHTTPClientTransport(new URL(`${handle.url}/mcp`), {
          requestInit: { headers: { Authorization: `Bearer ${TEST_TOKEN}` } },
        });
        const client = new Client({ name, version: "0.0.0" });
        await client.connect(transport);
        return client;
      };
      const first = await connectClient("client-a");
      const second = await connectClient("client-b");
      expect(first.getServerVersion()?.name).toBe("better-caprover-mcp");
      expect(second.getServerVersion()?.name).toBe("better-caprover-mcp");
      await first.close();
      await second.close();
    } finally {
      await handle.close();
    }
  });

  it("returns 429 when the request rate limit is exceeded", async () => {
    const handle = await HttpRunner.start(EnvTestUtil.build({
      CAPROVER_MCP_HTTP_TOKENS: { cursor: TEST_TOKEN },
      CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: 1,
    }));
    try {
      const headers = { "Authorization": `Bearer ${TEST_TOKEN}`, "Content-Type": "application/json" };
      const first = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}", headers: headers });
      expect(first.status).not.toBe(429);
      const second = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}", headers: headers });
      expect(second.status).toBe(429);
    } finally {
      await handle.close();
    }
  });
});
