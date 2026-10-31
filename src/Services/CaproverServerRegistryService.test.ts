import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeCaproverClientAdapter } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import { MockCaproverRouteBuilder } from "@/Adapters/CapRover/MockCaproverRouteBuilder.ts";
import { MockCaproverServer } from "@/Adapters/CapRover/MockCaproverServer.ts";
import { RoutingCaproverClientAdapter } from "@/Adapters/CapRover/RoutingCaproverClientAdapter.ts";
import { OperationManifest } from "@/Operations/OperationManifest.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { DEFAULT_SERVER_NAME } from "@/Schemas/ServerConfigSchema.ts";
import { SharedMcpRuntimeBuilder } from "@/Server/SharedMcpRuntimeBuilder.ts";
import { AuditLogService } from "@/Services/AuditLogService.ts";
import { CaproverServerRegistryService } from "@/Services/CaproverServerRegistryService.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

const READONLY_SECRET = "readonly-server-secret-abc";
const OPERATE_SECRET = "operate-server-secret-xyz";
const HTTP_TOKEN_SECRET = "http-bearer-token-secret-99";
const FAKE_PASSWORD = "fake-password-9876";

let mockServers: MockCaproverServer[] = [];

afterEach(async () => {
  await Promise.all(mockServers.map((server) => server.stop()));
  mockServers = [];
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const startMock = async (
  routes = MockCaproverRouteBuilder.buildDefault(),
): Promise<{
  url: string;
  mock: MockCaproverServer;
}> => {
  const mock = new MockCaproverServer(routes);
  mockServers.push(mock);
  const url = await mock.start();
  return { url, mock };
};

const buildMultiEnv = async (): Promise<{
  env: ReturnType<typeof EnvUtil.read>;
  readonlyMock: MockCaproverServer;
  operateMock: MockCaproverServer;
}> => {
  const readonly = await startMock();
  const operate = await startMock();
  vi.stubEnv("CAPROVER_MCP_SERVERS", JSON.stringify([
    { name: "readonly", url: readonly.url, mode: "readonly", passwordEnv: "CAPROVER_MCP_TEST_PW_READONLY" },
    { name: "operate", url: operate.url, mode: "operate", passwordEnv: "CAPROVER_MCP_TEST_PW_OPERATE" },
  ]));
  vi.stubEnv("CAPROVER_MCP_TEST_PW_READONLY", READONLY_SECRET);
  vi.stubEnv("CAPROVER_MCP_TEST_PW_OPERATE", OPERATE_SECRET);
  return { env: EnvUtil.read(), readonlyMock: readonly.mock, operateMock: operate.mock };
};

const buildRunnerFromEnv = (env: ReturnType<typeof EnvUtil.read>): OperationRunnerService => (
  SharedMcpRuntimeBuilder.buildFromEnv(env, () => 1_700_000_000_000).buildRunner()
);

const buildTools = (
  env: ReturnType<typeof EnvUtil.read>,
  runner: OperationRunnerService,
): ToolDefinition[] => {
  const registry = CaproverServerRegistryService.buildFromEnv(env);
  return OperationManifest.build(new RoutingCaproverClientAdapter(), registry, runner);
};

const findTool = (tools: ToolDefinition[], name: string): ToolDefinition => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    throw new Error(`missing ${name}`);
  }
  return tool;
};

describe("CaproverServerRegistryService.buildFromEnv()", () => {
  it("marks multi-server mode when two servers are configured", async () => {
    const { env } = await buildMultiEnv();

    const registry = CaproverServerRegistryService.buildFromEnv(env);

    expect(registry.getIsMultiServer()).toBe(true);
    expect(registry.listNames()).toStrictEqual(["operate", "readonly"]);
  });

  it("requires server_name and lists valid names when it is omitted", async () => {
    const { env } = await buildMultiEnv();
    const runner = buildRunnerFromEnv(env);
    const tools = buildTools(env, runner);
    const listApps = findTool(tools, "list_apps");

    const outcome = await listApps.call({});

    expect(outcome.isError).toBe(true);
    expect(outcome.summary).toBe(
      "Missing required parameter `server_name`. Call the tool again with `server_name` set to one of: operate, readonly.",
    );
  });

  it("denies a write on readonly and allows it on operate", async () => {
    const { env, readonlyMock, operateMock } = await buildMultiEnv();
    const runner = buildRunnerFromEnv(env);
    const tools = buildTools(env, runner);
    const scaleApp = findTool(tools, "scale_app");

    const denied = await scaleApp.call({ server_name: "readonly", app_name: "web", instance_count: 2 });
    const allowed = await scaleApp.call({ server_name: "operate", app_name: "web", instance_count: 2 });

    expect(denied.isError).toBe(true);
    expect(denied.summary).toBe(
      "scale_app is a write operation. This server runs in \"readonly\" mode, which does not allow it. "
      + "Do not try another way. Tell the person to set this server's mode to \"operate\" in the CapRover servers configuration and restart.",
    );
    expect(readonlyMock.requests.some((request) => request.path.includes("update"))).toBe(false);
    expect(allowed.isError).toBe(false);
    expect(operateMock.requests.some((request) => request.path.includes("update"))).toBe(true);
  });

  it("never leaks planted secrets in replies", async () => {
    const readonly = await startMock();
    const operate = await startMock();
    const readonlyFake = new FakeCaproverClientAdapter([], { failureMessage: `login failed ${READONLY_SECRET}` });
    const operateFake = new FakeCaproverClientAdapter([]);
    vi.stubEnv("CAPROVER_MCP_SERVERS", JSON.stringify([
      { name: "readonly", url: readonly.url, mode: "readonly", passwordEnv: "CAPROVER_MCP_TEST_PW_READONLY" },
      { name: "operate", url: operate.url, mode: "operate", passwordEnv: "CAPROVER_MCP_TEST_PW_OPERATE" },
    ]));
    vi.stubEnv("CAPROVER_MCP_TEST_PW_READONLY", READONLY_SECRET);
    vi.stubEnv("CAPROVER_MCP_TEST_PW_OPERATE", OPERATE_SECRET);
    vi.stubEnv("CAPROVER_MCP_HTTP_TOKENS", JSON.stringify({ cursor: HTTP_TOKEN_SECRET }));
    const env = EnvUtil.read();
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const caproverServerNameToFakeClient: Record<"readonly" | "operate", FakeCaproverClientAdapter> = {
      readonly: readonlyFake,
      operate: operateFake,
    };
    const registry = CaproverServerRegistryService.buildFromEnv(
      env,
      (entry) => caproverServerNameToFakeClient[entry.name as "readonly" | "operate"],
    );
    const runner = new OperationRunnerService(
      registry,
      new ConfirmationService(() => 0),
      new AuditLogService(),
      new ConcurrencyLimiterService(5),
      () => 0,
    );
    const tools = OperationManifest.build(new RoutingCaproverClientAdapter(), registry, runner);
    const listApps = findTool(tools, "list_apps");

    const reply = await listApps.call({ server_name: "readonly" });

    spy.mockRestore();
    expect(reply.summary).toBe("login failed [REDACTED]");
    expect(JSON.stringify(reply)).not.toContain(READONLY_SECRET);
    expect(JSON.stringify(reply)).not.toContain(OPERATE_SECRET);
    expect(JSON.stringify(reply)).not.toContain(HTTP_TOKEN_SECRET);
    const audit = lines.map((line) => JSON.parse(line.trim()) as Record<string, string>).find((entry) => entry.level === "audit");
    expect(audit?.server).toBe("readonly");
    expect(JSON.stringify(lines)).not.toContain(READONLY_SECRET);
    expect(JSON.stringify(lines)).not.toContain(OPERATE_SECRET);
    expect(JSON.stringify(lines)).not.toContain(HTTP_TOKEN_SECRET);
  });

  it("does not echo an unknown server name in the tool error or audit", async () => {
    const { env } = await buildMultiEnv();
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const runner = buildRunnerFromEnv(env);
    const tools = buildTools(env, runner);
    const listApps = findTool(tools, "list_apps");

    const outcome = await listApps.call({ server_name: "missing-prod-name" });

    spy.mockRestore();
    expect(outcome.isError).toBe(true);
    expect(outcome.summary).toBe(
      "Unknown server name. Use one of these configured names: operate, readonly.",
    );
    expect(outcome.summary).not.toContain("missing-prod-name");
    const audit = lines.map((line) => JSON.parse(line.trim()) as Record<string, string>).find((entry) => entry.level === "audit");
    expect(audit?.server).toBe("unknown");
  });

  it("returns a concurrency message after waiting when the per-server limit is saturated", async () => {
    vi.useFakeTimers();
    let resolveHang = (): void => undefined;
    const hangFirst = new Promise<void>((resolve) => {
      resolveHang = resolve;
    });
    const routes = MockCaproverRouteBuilder.buildDefault();
    const mock = new MockCaproverServer(routes, { hangGetAppDefinitionsUntil: () => hangFirst });
    mockServers.push(mock);
    const url = await mock.start();
    vi.stubEnv("CAPROVER_URL", url);
    vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);
    vi.stubEnv("CAPROVER_MCP_MODE", "admin");
    vi.stubEnv("CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER", "1");
    const env = EnvUtil.read();
    const runner = new OperationRunnerService(
      CaproverServerRegistryService.buildFromEnv(env),
      new ConfirmationService(() => 0),
      new AuditLogService(),
      new ConcurrencyLimiterService(1),
      () => 0,
    );
    const tools = buildTools(env, runner);
    const listApps = findTool(tools, "list_apps");
    const first = listApps.call({});
    const second = listApps.call({});
    await vi.advanceTimersByTimeAsync(30_001);
    const blocked = await second;
    resolveHang();
    vi.useRealTimers();
    await first;
    expect(blocked.isError).toBe(true);
    expect(blocked.summary).toBe(
      `Too many concurrent calls for server "${DEFAULT_SERVER_NAME}" (limit 1). Wait for other calls to finish, then try again.`,
    );
  });

  it("writes one audit line per call without argument values", async () => {
    const { url } = await startMock();
    vi.stubEnv("CAPROVER_URL", url);
    vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);
    vi.stubEnv("CAPROVER_MCP_MODE", "admin");
    const env = EnvUtil.read();
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const runner = buildRunnerFromEnv(env);
    const tools = buildTools(env, runner);
    const listApps = findTool(tools, "list_apps");

    await listApps.call({ name_contains: "hidden-value" });

    spy.mockRestore();
    const auditLines = lines.map((line) => JSON.parse(line.trim()) as Record<string, string>);
    expect(auditLines.filter((entry) => entry.level === "audit")).toHaveLength(1);
    const audit = auditLines.find((entry) => entry.level === "audit");
    expect(audit?.level).toBe("audit");
    expect(audit?.tool).toBe("list_apps");
    expect(audit?.server).toBe(DEFAULT_SERVER_NAME);
    expect(audit?.risk).toBe("read");
    expect(audit?.result).toBe("ok");
    expect(audit?.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.stringify(audit)).not.toContain("hidden-value");
  });
});
