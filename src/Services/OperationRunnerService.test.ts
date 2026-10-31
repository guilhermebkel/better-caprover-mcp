import { describe, expect, it } from "vitest";
import { FakeCaproverClientAdapter } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import { RoutingCaproverClientAdapter } from "@/Adapters/CapRover/RoutingCaproverClientAdapter.ts";
import { OperationManifest } from "@/Operations/OperationManifest.ts";
import type { AccessMode } from "@/Protocols/AccessProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { DEFAULT_SERVER_NAME } from "@/Schemas/ServerConfigSchema.ts";
import { AuditLogService } from "@/Services/AuditLogService.ts";
import { CaproverServerRegistryService, type CaproverClientFactory } from "@/Services/CaproverServerRegistryService.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";

const FAKE_PASSWORD = "fake-password-9876";

const buildEnv = (mode: AccessMode): Env => ({
  CAPROVER_MCP_MODE: mode,
  CAPROVER_MCP_ALLOW_CRITICAL: false,
  CAPROVER_URL: "https://captain.example.com",
  CAPROVER_PASSWORD: FAKE_PASSWORD,
  CAPROVER_MCP_HTTP_HOST: "127.0.0.1",
  CAPROVER_MCP_HTTP_PORT: 3100,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: 1_048_576,
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: 120,
  CAPROVER_MCP_MAX_HTTP_SESSIONS: 64,
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: 86_400_000,
  CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: 5,
  servers: [{
    isCriticalAllowed: false,
    name: DEFAULT_SERVER_NAME,
    password: FAKE_PASSWORD,
    url: "https://captain.example.com",
    mode,
  }],
});

const buildTestClient = (fake: FakeCaproverClientAdapter): CaproverClientFactory => () => fake;

const buildTool = (mode: AccessMode, name: string, fake: FakeCaproverClientAdapter): ToolDefinition => {
  const registry = CaproverServerRegistryService.buildFromEnv(buildEnv(mode), buildTestClient(fake));
  const runner = new OperationRunnerService(
    registry,
    new ConfirmationService(() => 0),
    new AuditLogService(),
    new ConcurrencyLimiterService(5),
    () => 0,
  );
  const tools = OperationManifest.build(new RoutingCaproverClientAdapter(), registry, runner);
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    throw new Error(`No tool ${name}`);
  }
  return tool;
};

describe("OperationRunnerService.buildTool()", () => {
  describe("when the mode does not allow the operation", () => {
    it("refuses a write in readonly mode before it reads anything", async () => {
      const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);

      const outcome = await buildTool("readonly", "scale_app", fake).call({ app_name: "web", instance_count: 2 });

      expect(outcome.isError).toBe(true);
      expect(outcome.summary).toContain("CAPROVER_MCP_MODE=operate");
      expect(fake.calls).toStrictEqual([]);
    });

    it("refuses a delete in operate mode even with a confirmation token", async () => {
      const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);

      const outcome = await buildTool("operate", "delete_app", fake).call({
        app_name: "web",
        user_confirmed: true,
        confirmation_token: "0".repeat(32),
      });

      expect(outcome.isError).toBe(true);
      expect(outcome.summary).toContain("CAPROVER_MCP_MODE=admin");
      expect(fake.calls).toStrictEqual([]);
    });
  });

  describe("when the input is invalid", () => {
    it("returns the valid range instead of calling CapRover", async () => {
      const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);

      const outcome = await buildTool("admin", "scale_app", fake).call({ app_name: "web", instance_count: 99 });

      expect(outcome.isError).toBe(true);
      expect(outcome.summary).toContain("Too big: expected number to be <=50\n  → at instance_count");
      expect(fake.calls).toStrictEqual([]);
    });

    it("returns the valid values of an enum", async () => {
      const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);

      const outcome = await buildTool("admin", "list_apps", fake).call({ response_format: "long" });

      expect(outcome.summary).toContain("expected one of \"concise\"|\"detailed\"");
    });
  });

  describe("when the client fails", () => {
    it("hides the password from the message", async () => {
      const fake = new FakeCaproverClientAdapter([], { failureMessage: `bad login ${FAKE_PASSWORD}` });

      const outcome = await buildTool("admin", "list_apps", fake).call({});

      expect(outcome).toStrictEqual({ isError: true, summary: "bad login [REDACTED]", data: {} });
    });
  });
});
