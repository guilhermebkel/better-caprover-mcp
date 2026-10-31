import { describe, expect, it, vi } from "vitest";
import { FakeCaproverClientAdapter } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import { RoutingCaproverClientAdapter } from "@/Adapters/CapRover/RoutingCaproverClientAdapter.ts";
import { OperationManifest } from "@/Operations/OperationManifest.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { DEFAULT_SERVER_NAME } from "@/Schemas/ServerConfigSchema.ts";
import { AuditLogService } from "@/Services/AuditLogService.ts";
import { CaproverServerRegistryService } from "@/Services/CaproverServerRegistryService.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { PolicyService } from "@/Services/PolicyService.ts";

const READONLY_SECRET = "readonly-server-secret-abc";
const OPERATE_SECRET = "operate-server-secret-xyz";
const HTTP_TOKEN_SECRET = "http-bearer-token-secret-99";

const buildMultiRunner = (): {
  readonlyFake: FakeCaproverClientAdapter;
  operateFake: FakeCaproverClientAdapter;
  runner: OperationRunnerService;
  registry: CaproverServerRegistryService;
} => {
  const readonlyFake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);
  const operateFake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp({ appName: "api" })]);
  const registry = CaproverServerRegistryService.buildForTest([
    {
      name: "readonly",
      client: readonlyFake,
      policy: new PolicyService("readonly", false, true),
      secrets: [READONLY_SECRET],
    },
    {
      name: "operate",
      client: operateFake,
      policy: new PolicyService("operate", false, true),
      secrets: [OPERATE_SECRET],
    },
  ], true);
  const runner = new OperationRunnerService(
    registry,
    new ConfirmationService(() => 0),
    new AuditLogService(),
    new ConcurrencyLimiterService(5),
    () => 1_700_000_000_000,
  );
  return { readonlyFake, operateFake, runner, registry };
};

const buildTools = (
  registry: CaproverServerRegistryService,
  runner: OperationRunnerService,
): ToolDefinition[] => OperationManifest.build(new RoutingCaproverClientAdapter(), registry, runner);

const findTool = (tools: ToolDefinition[], name: string): ToolDefinition => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    throw new Error(`missing ${name}`);
  }
  return tool;
};

describe("CaproverServerRegistryService.buildForTest()", () => {
  it("requires server and lists valid names when it is omitted", async () => {
    const { runner, registry } = buildMultiRunner();
    const tools = buildTools(registry, runner);
    const listApps = findTool(tools, "list_apps");

    const outcome = await listApps.call({});

    expect(outcome.isError).toBe(true);
    expect(outcome.summary).toContain("Valid server names: operate, readonly.");
  });

  it("denies a write on readonly and allows it on operate", async () => {
    const { readonlyFake, operateFake, runner, registry } = buildMultiRunner();
    const tools = buildTools(registry, runner);
    const scaleApp = findTool(tools, "scale_app");

    const denied = await scaleApp.call({ server: "readonly", app_name: "web", instance_count: 2 });
    const allowed = await scaleApp.call({ server: "operate", app_name: "api", instance_count: 2 });

    expect(denied.isError).toBe(true);
    expect(denied.summary).toContain("CapRover servers configuration");
    expect(readonlyFake.calls).toStrictEqual([]);
    expect(allowed.isError).toBe(false);
    expect(operateFake.calls).toContain("setInstanceCount:api:2");
  });

  it("never leaks planted secrets in replies", async () => {
    const readonlyFake = new FakeCaproverClientAdapter([], { failureMessage: `login failed ${READONLY_SECRET}` });
    const registry = CaproverServerRegistryService.buildForTest([
      {
        name: "readonly",
        client: readonlyFake,
        policy: new PolicyService("readonly", false, true),
        secrets: [READONLY_SECRET],
      },
      {
        name: "operate",
        client: new FakeCaproverClientAdapter([]),
        policy: new PolicyService("operate", false, true),
        secrets: [OPERATE_SECRET],
      },
    ], true, [HTTP_TOKEN_SECRET]);
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const runner = new OperationRunnerService(
      registry,
      new ConfirmationService(() => 0),
      new AuditLogService(),
      new ConcurrencyLimiterService(5),
      () => 0,
    );
    const tools = buildTools(registry, runner);
    const listApps = findTool(tools, "list_apps");

    const reply = await listApps.call({ server: "readonly" });

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
    const { runner, registry } = buildMultiRunner();
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const tools = buildTools(registry, runner);
    const listApps = findTool(tools, "list_apps");

    const outcome = await listApps.call({ server: "missing-prod-name" });

    spy.mockRestore();
    expect(outcome.isError).toBe(true);
    expect(outcome.summary).toContain("Unknown server name.");
    expect(outcome.summary).not.toContain("missing-prod-name");
    const audit = lines.map((line) => JSON.parse(line.trim()) as Record<string, string>).find((entry) => entry.level === "audit");
    expect(audit?.server).toBe("unknown");
  });

  it("returns a concurrency message after waiting when the per-server limit is saturated", async () => {
    vi.useFakeTimers();
    let releaseFirst = (): void => undefined;
    const hangFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()], {
      hangUntilReleased: () => hangFirst,
    });
    const registry = CaproverServerRegistryService.buildForTest([{
      name: DEFAULT_SERVER_NAME,
      client: fake,
      policy: new PolicyService("admin", false),
      secrets: [],
    }]);
    const runner = new OperationRunnerService(
      registry,
      new ConfirmationService(() => 0),
      new AuditLogService(),
      new ConcurrencyLimiterService(1),
      () => 0,
    );
    const tools = buildTools(registry, runner);
    const listApps = findTool(tools, "list_apps");
    const first = listApps.call({});
    const second = listApps.call({});
    await vi.advanceTimersByTimeAsync(30_001);
    const blocked = await second;
    releaseFirst();
    vi.useRealTimers();
    await first;
    expect(blocked.isError).toBe(true);
    expect(blocked.summary).toContain("Too many concurrent calls");
  });

  it("writes one audit line per call without argument values", async () => {
    const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);
    const registry = CaproverServerRegistryService.buildForTest([{
      name: DEFAULT_SERVER_NAME,
      client: fake,
      policy: new PolicyService("admin", false),
      secrets: [],
    }]);
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const runner = new OperationRunnerService(
      registry,
      new ConfirmationService(() => 0),
      new AuditLogService(),
      new ConcurrencyLimiterService(5),
      () => 1_700_000_000_000,
    );
    const tools = buildTools(registry, runner);
    const listApps = findTool(tools, "list_apps");

    await listApps.call({ name_contains: "hidden-value" });

    spy.mockRestore();
    const auditLines = lines.map((line) => JSON.parse(line.trim()) as Record<string, string>);
    expect(auditLines.filter((entry) => entry.level === "audit")).toHaveLength(1);
    const audit = auditLines.find((entry) => entry.level === "audit");
    expect(audit).toMatchObject({ tool: "list_apps", server: DEFAULT_SERVER_NAME, risk: "read", result: "ok" });
    expect(JSON.stringify(audit)).not.toContain("hidden-value");
  });
});
