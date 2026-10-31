import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildDefaultMockRoutes } from "@/Adapters/CapRover/MockCaproverRoutes.ts";
import { MockCaproverServer } from "@/Adapters/CapRover/MockCaproverServer.ts";
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import { HttpRunner } from "@/Server/HttpRunner.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

const TEST_TOKEN = "test-token-12345678";
const WRONG_TOKEN = "wrong-token-123456789";
const FAKE_PASSWORD = "fake-password-9876";

const connectAuthorizedClient = async (baseUrl: string, clientName: string, token = TEST_TOKEN): Promise<Client> => {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: clientName, version: "0.0.0" });
  await client.connect(transport);
  return client;
};

const readToolText = (content: unknown): string => {
  if (!Array.isArray(content) || content.length === 0) {
    return "";
  }
  const first: unknown = content[0];
  if (typeof first !== "object" || first === null || !("text" in first)) {
    return "";
  }
  const text = (first as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
};

let mockServers: MockCaproverServer[] = [];

afterEach(async () => {
  await Promise.all(mockServers.map((server) => server.stop()));
  mockServers = [];
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const readHttpEnv = (overrides: Record<string, string | undefined> = {}): ReturnType<typeof EnvUtil.read> => {
  vi.stubEnv("CAPROVER_MCP_MODE", overrides.CAPROVER_MCP_MODE ?? "readonly");
  vi.stubEnv("CAPROVER_MCP_HTTP_HOST", overrides.CAPROVER_MCP_HTTP_HOST ?? "127.0.0.1");
  if (overrides.CAPROVER_MCP_HTTP_PORT !== undefined) {
    vi.stubEnv("CAPROVER_MCP_HTTP_PORT", overrides.CAPROVER_MCP_HTTP_PORT);
  }
  vi.stubEnv("CAPROVER_MCP_HTTP_TOKENS", overrides.CAPROVER_MCP_HTTP_TOKENS);
  vi.stubEnv("CAPROVER_MCP_MAX_HTTP_BODY_BYTES", overrides.CAPROVER_MCP_MAX_HTTP_BODY_BYTES);
  vi.stubEnv("CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE", overrides.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE);
  vi.stubEnv("CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER", overrides.CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER);
  vi.stubEnv("CAPROVER_URL", overrides.CAPROVER_URL);
  vi.stubEnv("CAPROVER_PASSWORD", overrides.CAPROVER_PASSWORD);
  return EnvUtil.read();
};

describe("HttpRunner.assertBindAllowed()", () => {
  it("refuses a public bind without CAPROVER_MCP_HTTP_TOKENS", () => {
    const env = readHttpEnv({ CAPROVER_MCP_HTTP_HOST: "0.0.0.0" });

    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).toThrow(HttpBindForbiddenError);
    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).toThrow(/CAPROVER_MCP_HTTP_TOKENS/);
  });

  it("allows localhost without tokens", () => {
    const env = readHttpEnv({ CAPROVER_MCP_HTTP_HOST: "127.0.0.1" });

    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).not.toThrow();
  });
});

describe("HttpRunner.start()", () => {
  it("returns 401 for MCP on localhost when no bearer token is configured", async () => {
    const handle = await HttpRunner.start(readHttpEnv());
    try {
      const response = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}" });
      expect(response.status).toBe(401);
    } finally {
      await handle.close();
    }
  });

  it("returns 401 for a request with the wrong bearer token and runs no tools", async () => {
    const mock = new MockCaproverServer(buildDefaultMockRoutes());
    mockServers.push(mock);
    const captainUrl = await mock.start();
    const listAppsSpy = vi.spyOn(CaproverClientAdapter.prototype, "listApps");
    const handle = await HttpRunner.start(readHttpEnv({
      CAPROVER_MCP_HTTP_TOKENS: JSON.stringify({ cursor: TEST_TOKEN }),
      CAPROVER_URL: captainUrl,
      CAPROVER_PASSWORD: FAKE_PASSWORD,
    }));
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
      expect(listAppsSpy).not.toHaveBeenCalled();
    } finally {
      await handle.close();
    }
  });

  it("answers health checks without auth", async () => {
    const handle = await HttpRunner.start(readHttpEnv());
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
    const handle = await HttpRunner.start(readHttpEnv({
      CAPROVER_MCP_HTTP_TOKENS: JSON.stringify({ cursor: TEST_TOKEN }),
      CAPROVER_MCP_MAX_HTTP_BODY_BYTES: "32",
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
    const tokens = JSON.stringify({ cursor: TEST_TOKEN });
    const handle = await HttpRunner.start(readHttpEnv({ CAPROVER_MCP_HTTP_TOKENS: tokens }));
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
    const tokens = JSON.stringify({ cursor: TEST_TOKEN });
    const handle = await HttpRunner.start(readHttpEnv({ CAPROVER_MCP_HTTP_TOKENS: tokens }));
    try {
      const first = await connectAuthorizedClient(handle.url, "client-a");
      const second = await connectAuthorizedClient(handle.url, "client-b");
      expect(first.getServerVersion()?.name).toBe("better-caprover-mcp");
      expect(second.getServerVersion()?.name).toBe("better-caprover-mcp");
      await first.close();
      await second.close();
    } finally {
      await handle.close();
    }
  });

  it("returns 429 when the request rate limit is exceeded, including failed auth", async () => {
    const handle = await HttpRunner.start(readHttpEnv({
      CAPROVER_MCP_HTTP_TOKENS: JSON.stringify({ cursor: TEST_TOKEN }),
      CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: "1",
    }));
    try {
      const headers = { "Authorization": `Bearer ${WRONG_TOKEN}`, "Content-Type": "application/json" };
      const first = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}", headers: headers });
      expect(first.status).toBe(401);
      const second = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}", headers: headers });
      expect(second.status).toBe(429);
    } finally {
      await handle.close();
    }
  });

  it("shares the per-server concurrency limit across HTTP sessions", async () => {
    vi.useFakeTimers();
    const mock = new MockCaproverServer(buildDefaultMockRoutes());
    mockServers.push(mock);
    const captainUrl = await mock.start();
    let resolveHang = (): void => undefined;
    const hangFirst = new Promise<import("@/Protocols/CaproverClientProtocol.ts").CaproverAppList>((resolve) => {
      resolveHang = () => {
        resolve({ apps: [], rootDomain: "example.com" });
      };
    });
    vi.spyOn(CaproverClientAdapter.prototype, "listApps").mockImplementationOnce(() => hangFirst);
    const handle = await HttpRunner.start(readHttpEnv({
      CAPROVER_MCP_HTTP_TOKENS: JSON.stringify({ cursor: TEST_TOKEN }),
      CAPROVER_URL: captainUrl,
      CAPROVER_PASSWORD: FAKE_PASSWORD,
      CAPROVER_MCP_MODE: "admin",
      CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: "1",
    }));
    try {
      const firstClient = await connectAuthorizedClient(handle.url, "session-a");
      const secondClient = await connectAuthorizedClient(handle.url, "session-b");
      const firstCall = firstClient.callTool({ name: "list_apps", arguments: {} });
      const secondCall = secondClient.callTool({ name: "list_apps", arguments: {} });
      await vi.advanceTimersByTimeAsync(30_001);
      const blocked = await secondCall;
      resolveHang();
      vi.useRealTimers();
      await firstCall;
      expect(blocked.isError).toBe(true);
      const text = readToolText(blocked.content);
      expect(text).toContain("Too many concurrent calls for server \"default\"");
      await firstClient.close();
      await secondClient.close();
    } finally {
      await handle.close();
    }
  });
});
