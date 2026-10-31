import { describe, expect, it } from "vitest";
import { FakeCaproverClientAdapter } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import { OperationManifest } from "@/Operations/OperationManifest.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { CaproverClientFactory } from "@/Server/SharedMcpRuntimeBuilder.ts";
import { AuditLogService } from "@/Services/AuditLogService.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { PolicyService } from "@/Services/PolicyService.ts";

const MAX_DESCRIPTION_LENGTH = 640;
const MIN_REPEATED_SENTENCE_WORDS = 12;
const FIELD_NAMES = [
  "dry_run", "user_confirmed", "confirmation_token", "name_contains", "env_vars", "remove_keys",
  "delete_volumes", "response_format",
];

const buildTestEnv = (): Env => ({
  CAPROVER_MCP_MODE: "admin",
  CAPROVER_MCP_ALLOW_CRITICAL: false,
  CAPROVER_URL: "https://captain.example.com",
  CAPROVER_PASSWORD: undefined,
  CAPROVER_MCP_HTTP_HOST: "127.0.0.1",
  CAPROVER_MCP_HTTP_PORT: 3100,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: 1_048_576,
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: 120,
  CAPROVER_MCP_MAX_HTTP_SESSIONS: 64,
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: 86_400_000,
  CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: 5,
});

const buildTools = (): ToolDefinition[] => {
  const fake = new FakeCaproverClientAdapter([]);
  const env = buildTestEnv();
  const createClient: CaproverClientFactory = () => fake;
  const client = createClient(env);
  const policy = new PolicyService(env.CAPROVER_MCP_MODE, env.CAPROVER_MCP_ALLOW_CRITICAL);
  const runner = new OperationRunnerService({
    policy,
    secrets: [],
    confirmation: new ConfirmationService(() => 0),
    audit: new AuditLogService(),
    limiter: new ConcurrencyLimiterService(5),
    getNowMs: () => 0,
  });
  return OperationManifest.build(client, policy, runner);
};

describe("OperationManifest.build()", () => {
  it("lists every operation once, with its tier", () => {
    const tools = buildTools().map((tool) => `${tool.name}:${tool.risk}`);

    expect(tools).toStrictEqual([
      "get_overview:read",
      "list_apps:read",
      "get_app:read",
      "get_app_runtime:read",
      "get_app_logs:read",
      "get_build_logs:read",
      "list_one_click_apps:read",
      "create_app:write",
      "deploy_image:write",
      "set_env_vars:write",
      "scale_app:write",
      "add_custom_domain:write",
      "enable_ssl:write",
      "delete_app:destructive",
    ]);
  });

  it("starts the description of every read operation with Read-only.", () => {
    const readTools = buildTools().filter((tool) => tool.risk === "read");

    expect(readTools).toHaveLength(7);
    expect(readTools.filter((tool) => !tool.description.startsWith("Read-only. "))).toStrictEqual([]);
  });

  it("keeps every description within the length limit", () => {
    const tooLong = buildTools().filter((tool) => tool.description.length > MAX_DESCRIPTION_LENGTH);

    expect(tooLong.map((tool) => tool.name)).toStrictEqual([]);
  });

  it("names only operations that exist when a description points to a neighbor", () => {
    const tools = buildTools();
    const names = new Set(tools.map((tool) => tool.name));
    const mentioned = tools.flatMap((tool) => [...tool.description.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((match) => match[1] ?? ""));
    const unknown = mentioned.filter((word) => !names.has(word) && !FIELD_NAMES.includes(word));

    expect(mentioned.length).toBeGreaterThan(0);
    expect(unknown).toStrictEqual([]);
  });

  it("never points a description to a file or a guide topic", () => {
    const pointing = buildTools().filter((tool) => /\.md\b|guide|caprover:\/\//i.test(tool.description));

    expect(pointing).toStrictEqual([]);
  });

  it("does not repeat a long sentence in two descriptions", () => {
    const sentences = buildTools().flatMap((tool) => tool.description.split(/(?<=\.)\s+/));
    const long = sentences.filter((sentence) => sentence.split(" ").length >= MIN_REPEATED_SENTENCE_WORDS);

    expect(long.filter((sentence, index) => long.indexOf(sentence) !== index)).toStrictEqual([]);
  });

  it("says in the description of delete_app that the person must have asked and that it cannot be undone", () => {
    const description = buildTools().find((tool) => tool.name === "delete_app")?.description ?? "";

    expect(description).toContain("only when the person asked");
    expect(description).toContain("cannot be restored");
  });
});
