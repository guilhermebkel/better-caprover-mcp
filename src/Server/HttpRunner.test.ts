import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MockCaproverRouteBuilder } from "@/Adapters/CapRover/MockCaproverRouteBuilder.ts";
import { MockCaproverServer } from "@/Adapters/CapRover/MockCaproverServer.ts";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import { HttpRunner, type HttpRunnerStartOptions } from "@/Server/HttpRunner.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

const CONCURRENCY_REFUSAL_MESSAGE = "Too many concurrent tool calls (limit 1). Wait for other calls to finish, then try again.";
const TEST_TOKEN = "test-token-12345678";
const WRONG_TOKEN = "wrong-token-123456789";
const CONCURRENCY_TEST_QUEUE_WAIT_MS = 50;
const LIST_APPS_MOCK_SUCCESS_SUMMARY = "2 apps match; showing 2.";

const connectAuthorizedClient = async (baseUrl: string, clientName: string, token = TEST_TOKEN): Promise<Client> => {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: clientName, version: "0.0.0" });
  await client.connect(transport);
  return client;
};

const buildInitializeJson = (clientName: string, id = 1): string => JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: clientName, version: "0.0.0" },
  },
  id,
});

const postMcp = async (
  baseUrl: string,
  token: string,
  body: string,
  sessionId?: string,
): Promise<Response> => fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    ...(sessionId === undefined ? {} : { "mcp-session-id": sessionId }),
  },
  body,
});

const postMcpWithoutAuth = async (
  baseUrl: string,
  body: string,
  sessionId?: string,
): Promise<Response> => fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    ...(sessionId === undefined ? {} : { "mcp-session-id": sessionId }),
  },
  body,
});

let mockServers: MockCaproverServer[] = [];

afterEach(async () => {
  await Promise.all(mockServers.map((server) => server.stop()));
  mockServers = [];
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

let nextHttpPort = 32_000 + (process.pid % 10_000);
let nextHttpMarkerId = 0;

const pickNextHttpPort = (): number => {
  const port = nextHttpPort;
  nextHttpPort += 1;
  return port;
};

const FAKE_PASSWORD = "fake-password-9876";

const readHttpEnv = (overrides: Record<string, string | undefined> = {}): ReturnType<typeof EnvUtil.read> => {
  vi.stubEnv("CAPROVER_MCP_MODE", overrides.CAPROVER_MCP_MODE ?? "readonly");
  vi.stubEnv("CAPROVER_MCP_HTTP_HOST", overrides.CAPROVER_MCP_HTTP_HOST ?? "127.0.0.1");
  vi.stubEnv(
    "CAPROVER_MCP_HTTP_PORT",
    overrides.CAPROVER_MCP_HTTP_PORT ?? String(pickNextHttpPort()),
  );
  vi.stubEnv("CAPROVER_MCP_HTTP_TOKEN", overrides.CAPROVER_MCP_HTTP_TOKEN);
  vi.stubEnv("CAPROVER_MCP_MAX_HTTP_BODY_BYTES", overrides.CAPROVER_MCP_MAX_HTTP_BODY_BYTES ?? "1048576");
  vi.stubEnv("CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE", overrides.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE ?? "120");
  vi.stubEnv("CAPROVER_MCP_MAX_HTTP_SESSIONS", overrides.CAPROVER_MCP_MAX_HTTP_SESSIONS ?? "64");
  vi.stubEnv("CAPROVER_MCP_HTTP_SESSION_TTL_MS", overrides.CAPROVER_MCP_HTTP_SESSION_TTL_MS ?? "86400000");
  vi.stubEnv("CAPROVER_MCP_MAX_CONCURRENT", overrides.CAPROVER_MCP_MAX_CONCURRENT ?? "5");
  vi.stubEnv("CAPROVER_URL", overrides.CAPROVER_URL);
  vi.stubEnv("CAPROVER_PASSWORD", overrides.CAPROVER_PASSWORD);
  return EnvUtil.read();
};

const startHttpRunner = (
  overrides: Record<string, string | undefined> = {},
  runnerOptions: Omit<HttpRunnerStartOptions, "httpMarkerPath"> = {},
): ReturnType<typeof HttpRunner.start> => {
  nextHttpMarkerId += 1;
  const markerPath = `/tmp/better-caprover-mcp-http.test-${process.pid}-${nextHttpMarkerId}.active`;
  return HttpRunner.start(readHttpEnv(overrides), { httpMarkerPath: markerPath, ...runnerOptions });
};

const readToolSummary = (content: unknown): string => {
  const first: unknown = Array.isArray(content) ? content[0] : undefined;
  if (typeof first !== "object" || first === null || !("text" in first)) {
    return "";
  }
  const text = typeof first.text === "string" ? first.text : "";
  const newlineIndex = text.indexOf("\n");
  return newlineIndex === -1 ? text : text.slice(0, newlineIndex);
};

type ToolCallOutcome = {
  isError: boolean;
  summary: string;
};

const readCallOutcome = (result: Awaited<ReturnType<Client["callTool"]>>): ToolCallOutcome => ({
  isError: result.isError === true,
  summary: readToolSummary(result.content),
});

const sortCallOutcomes = (left: ToolCallOutcome, right: ToolCallOutcome): number => (
  Number(left.isError) - Number(right.isError)
);

describe("HttpRunner.assertBindAllowed()", () => {
  it("refuses a public bind without CAPROVER_MCP_HTTP_TOKEN", () => {
    const env = readHttpEnv({ CAPROVER_MCP_HTTP_HOST: "0.0.0.0" });

    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).toThrow(HttpBindForbiddenError);
    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).toThrow(/^Refusing to bind HTTP on a non-local address without authentication\. Set CAPROVER_MCP_HTTP_TOKEN to the bearer secret clients must send\.$/);
  });

  it("allows localhost without CAPROVER_MCP_HTTP_TOKEN", () => {
    const env = readHttpEnv({ CAPROVER_MCP_HTTP_HOST: "127.0.0.1" });

    expect(() => {
      HttpRunner.assertBindAllowed(env);
    }).not.toThrow();
  });
});

describe("HttpRunner.start()", () => {
  it("returns 401 for MCP on localhost when no bearer token is configured", async () => {
    const handle = await startHttpRunner();
    try {
      const response = await fetch(`${handle.url}/mcp`, { method: "POST", body: "{}" });
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    } finally {
      await handle.close();
    }
  });

  it("returns 401 when Authorization is missing and a token is configured", async () => {
    const mock = new MockCaproverServer(MockCaproverRouteBuilder.buildDefault());
    mockServers.push(mock);
    const captainUrl = await mock.start();
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_URL: captainUrl,
      CAPROVER_PASSWORD: FAKE_PASSWORD,
    });
    try {
      const response = await postMcpWithoutAuth(
        handle.url,
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_overview", arguments: {} },
        }),
      );
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
      expect(mock.requests.some((request) => request.path.includes("appDefinitions"))).toBe(false);
    } finally {
      await handle.close();
    }
  });

  it("returns 401 for a request with the wrong bearer token and runs no tools", async () => {
    const mock = new MockCaproverServer(MockCaproverRouteBuilder.buildDefault());
    mockServers.push(mock);
    const captainUrl = await mock.start();
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_URL: captainUrl,
      CAPROVER_PASSWORD: FAKE_PASSWORD,
    });
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
      expect(mock.requests.some((request) => request.path.includes("appDefinitions"))).toBe(false);
    } finally {
      await handle.close();
    }
  });

  it("answers health checks without auth", async () => {
    const handle = await startHttpRunner();
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
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_MCP_MAX_HTTP_BODY_BYTES: "32",
    });
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
    const handle = await startHttpRunner({ CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN });
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
    const handle = await startHttpRunner({ CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN });
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
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: "1",
    });
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

  it("returns 429 when authenticated MCP requests share one rate limit bucket", async () => {
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: "1",
    });
    try {
      const first = await postMcp(handle.url, TEST_TOKEN, buildInitializeJson("rate-limit-a"));
      expect(first.status).toBe(200);
      const second = await postMcp(handle.url, TEST_TOKEN, buildInitializeJson("rate-limit-a2", 2));
      expect(second.status).toBe(429);
    } finally {
      await handle.close();
    }
  });

  it("returns 503 when the HTTP session cap is reached", async () => {
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_MCP_MAX_HTTP_SESSIONS: "1",
    });
    try {
      const first = await postMcp(handle.url, TEST_TOKEN, buildInitializeJson("session-cap-a"));
      await first.text();
      expect(first.status).toBe(200);
      const second = await postMcp(handle.url, TEST_TOKEN, buildInitializeJson("session-cap-b", 2));
      expect(second.status).toBe(503);
      expect(await second.text()).toBe("Service Unavailable");
    } finally {
      await handle.close();
    }
  });

  it("returns 401 when a session id is sent with the wrong bearer token", async () => {
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
    });
    try {
      const first = await postMcp(handle.url, TEST_TOKEN, buildInitializeJson("session-owner"));
      await first.text();
      const sessionId = first.headers.get("mcp-session-id");
      expect(sessionId).not.toBeNull();
      const response = await postMcp(
        handle.url,
        WRONG_TOKEN,
        JSON.stringify({ jsonrpc: "2.0", method: "ping" }),
        sessionId ?? undefined,
      );
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    } finally {
      await handle.close();
    }
  });

  it("shares the concurrency limit across HTTP sessions", async () => {
    let resolveHang = (): void => undefined;
    const hangFirst = new Promise<void>((resolve) => {
      resolveHang = resolve;
    });
    const mock = new MockCaproverServer(MockCaproverRouteBuilder.buildDefault(), {
      hangGetAppDefinitionsUntil: () => hangFirst,
    });
    mockServers.push(mock);
    const captainUrl = await mock.start();
    const refusalMessage = CONCURRENCY_REFUSAL_MESSAGE;
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_URL: captainUrl,
      CAPROVER_PASSWORD: FAKE_PASSWORD,
      CAPROVER_MCP_MODE: "admin",
      CAPROVER_MCP_MAX_CONCURRENT: "1",
    }, { concurrencyQueueWaitMs: CONCURRENCY_TEST_QUEUE_WAIT_MS });
    const firstClient = await connectAuthorizedClient(handle.url, "concurrency-a");
    const secondClient = await connectAuthorizedClient(handle.url, "concurrency-b");
    let firstSummary: string | undefined;
    let secondSummary: string | undefined;
    const firstCall = firstClient.callTool({ name: "list_apps", arguments: {} }).then((result) => {
      firstSummary = readToolSummary(result.content);
      return result;
    });
    const secondCall = secondClient.callTool({ name: "list_apps", arguments: {} }).then((result) => {
      secondSummary = readToolSummary(result.content);
      return result;
    });
    try {
      await expect.poll(() => {
        if (firstSummary === refusalMessage || secondSummary === refusalMessage) {
          return true;
        }
        return undefined;
      }).toBe(true);
    } finally {
      resolveHang();
    }
    const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);
    await firstClient.close();
    await secondClient.close();
    await handle.close();
    const outcomes = [readCallOutcome(firstResult), readCallOutcome(secondResult)].sort(sortCallOutcomes);
    expect(outcomes).toStrictEqual([
      { isError: false, summary: LIST_APPS_MOCK_SUCCESS_SUMMARY },
      { isError: true, summary: refusalMessage },
    ]);
  });

  it("drops HTTP sessions after TTL", async () => {
    const handle = await startHttpRunner({
      CAPROVER_MCP_HTTP_TOKEN: TEST_TOKEN,
      CAPROVER_MCP_HTTP_SESSION_TTL_MS: "200",
    });
    try {
      const first = await postMcp(handle.url, TEST_TOKEN, buildInitializeJson("session-ttl"));
      await first.text();
      const sessionId = first.headers.get("mcp-session-id");
      expect(sessionId).not.toBeNull();
      await expect.poll(async () => {
        const expired = await postMcp(
          handle.url,
          TEST_TOKEN,
          JSON.stringify({ jsonrpc: "2.0", method: "ping" }),
          sessionId ?? undefined,
        );
        return expired.status;
      }).toBe(404);
    } finally {
      await handle.close();
    }
  });
});
