import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FakeCaproverClientAdapter } from "@/Testing/FakeCaproverClientAdapter.ts";
import { OperationManifestSurface } from "@/Surfaces/OperationManifestSurface.ts";
import type { ToolDefinition, ToolOutcome } from "@/Protocols/OperationProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { CaproverClientFactory } from "@/Protocols/SharedMcpRuntimeProtocol.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { PolicyService } from "@/Services/PolicyService.ts";

const MAX_DESCRIPTION_LENGTH = 640;
const MIN_REPEATED_SENTENCE_WORDS = 12;
const FIELD_NAMES = [
  "dry_run", "user_confirmed", "confirmation_token", "name_contains", "env_vars", "remove_keys",
  "delete_volumes", "response_format", "previous_name",
];
const PLANTED_ENV_VALUE = "planted-env-value-4321";

const buildTestEnv = (): Env => ({
  CAPROVER_MCP_MODE: "admin",
  CAPROVER_MCP_ALLOW_CRITICAL: true,
  CAPROVER_MCP_TOOLSETS: ["core", "apps", "domains", "oneclick"],
  CAPROVER_URL: "https://captain.example.com",
  CAPROVER_PASSWORD: undefined,
  CAPROVER_MCP_HTTP_HOST: "127.0.0.1",
  CAPROVER_MCP_HTTP_PORT: 3100,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: 1_048_576,
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: 120,
  CAPROVER_MCP_MAX_HTTP_SESSIONS: 64,
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: 86_400_000,
  CAPROVER_MCP_MAX_CONCURRENT: 5,
});

const buildToolsWithFake = (fake: FakeCaproverClientAdapter): ToolDefinition[] => {
  const env = buildTestEnv();
  const createClient: CaproverClientFactory = () => fake;
  const client = createClient(env);
  const policy = new PolicyService(env.CAPROVER_MCP_MODE, env.CAPROVER_MCP_ALLOW_CRITICAL);
  const runner = new OperationRunnerService({
    policy,
    secrets: [],
    confirmation: new ConfirmationService(() => 0),
    limiter: new ConcurrencyLimiterService(5),
    getNowMs: () => 0,
  });
  return OperationManifestSurface.build(client, policy, runner, {
    toolsets: ["core", "apps", "domains", "projects", "oneclick", "registries", "cluster", "maintenance", "monitoring", "account"],
    isElicitationAvailable: () => false,
  });
};

type ContractRow = [string, Record<string, unknown>];

const REGISTRY_SECRET = "planted-registry-pass-77";

const REGISTRY_LOGIN = {
  registry_user: "deploy",
  registry_password: REGISTRY_SECRET,
  registry_domain: "registry.example.com",
};

const CONTRACT_ROWS: ContractRow[] = [
  ["get_overview", {}],
  ["get_access", {}],
  ["get_guide", { topic: "modes" }],
  ["list_apps", {}],
  ["get_app", { app_name: "web" }],
  ["get_app_runtime", { app_name: "web" }],
  ["get_app_logs", { app_name: "web" }],
  ["get_build_logs", { app_name: "web" }],
  ["list_apps_runtime", {}],
  ["create_app", { app_name: "new-app" }],
  ["deploy_image", { app_name: "web", image_name: "nginx:1.27" }],
  ["deploy_archive", { app_name: "web", source_archive: "dGFyLWJ5dGVz" }],
  ["start_build", { webhook_path: "/user/apps/webhooks/triggerbuild?namespace=captain&token=planted-hook-token-55" }],
  ["set_env_vars", { app_name: "web", env_vars: "LEVEL=info" }],
  ["scale_app", { app_name: "web", instance_count: 2 }],
  ["rename_app", { app_name: "web", new_app_name: "web-two" }],
  ["delete_app", { app_name: "web" }],
  ["add_custom_domain", { app_name: "web", domain: "api.example.org" }],
  ["enable_ssl", { app_name: "web" }],
  ["remove_custom_domain", { app_name: "web", domain: "www.example.org" }],
  ["enable_root_ssl", { email_address: "ops@example.com" }],
  ["set_force_ssl", { is_enabled: true }],
  ["update_root_domain", { root_domain: "apps.example.org" }],
  ["list_projects", {}],
  ["create_project", { project_name: "ops" }],
  ["update_project", { project_id: "p-1", project_name: "shop-two" }],
  ["delete_projects", { project_ids: ["p-2", "p-3"] }],
  ["list_one_click_apps", {}],
  ["get_one_click_app", { template_name: "postgres" }],
  ["list_one_click_repos", {}],
  ["add_one_click_repo", { repository_url: "https://example.com/apps" }],
  ["delete_one_click_repo", { repository_url: "https://oneclick-apps.caprover.com" }],
  ["deploy_one_click", { template_name: "postgres", variables: [{ variable_id: "$$cap_pg_pass", variable_value: "planted-db-pass-33" }] }],
  ["get_one_click_deploy_progress", { job_id: "job-1" }],
  ["list_registries", {}],
  ["add_registry", REGISTRY_LOGIN],
  ["update_registry", { registry_id: "reg-1", ...REGISTRY_LOGIN }],
  ["delete_registry", { registry_id: "reg-1" }],
  ["set_default_push_registry", { registry_id: "reg-1" }],
  ["enable_self_hosted_registry", {}],
  ["disable_self_hosted_registry", {}],
  ["list_nodes", {}],
  ["get_load_balancer", {}],
  ["add_node", {
    node_role: "worker",
    private_key: "-----BEGIN KEY----- planted-ssh-key-99",
    remote_node_ip_address: "10.0.0.2",
    captain_ip_address: "10.0.0.1",
  }],
  ["get_disk_usage", {}],
  ["list_unused_images", {}],
  ["delete_images", { image_ids: ["sha256:aaa", "sha256:bbb"] }],
  ["get_disk_cleanup", {}],
  ["set_disk_cleanup", { keep_recent_count: 3, cron_schedule: "0 2 * * *", timezone: "UTC" }],
  ["get_nginx_config", {}],
  ["set_nginx_config", { base_config: "# custom" }],
  ["update_caprover", {}],
  ["get_net_data", {}],
  ["set_net_data", { is_enabled: false }],
  ["get_go_access", {}],
  ["set_go_access", { is_enabled: true }],
  ["list_go_access_reports", { app_name: "web" }],
  ["get_two_factor_status", {}],
  ["set_password", { new_password: "planted-new-pass-11" }],
  ["get_pro_state", {}],
  ["set_pro_api_key", { api_key: "planted-pro-key-22" }],
  ["list_pro_alerts", {}],
  ["list_themes", {}],
  ["get_current_theme", {}],
  ["set_current_theme", { theme_name: "night" }],
  ["save_theme", { theme_name: "night", theme_content: "body { color: red; }" }],
  ["delete_theme", { theme_name: "night" }],
];

const PLANTED_SECRETS: [string, string][] = [
  ["start_build", "planted-hook-token-55"],
  ["deploy_one_click", "planted-db-pass-33"],
  ["add_registry", REGISTRY_SECRET],
  ["update_registry", REGISTRY_SECRET],
  ["add_node", "planted-ssh-key-99"],
  ["set_password", "planted-new-pass-11"],
  ["set_pro_api_key", "planted-pro-key-22"],
];

const buildContractFake = (): FakeCaproverClientAdapter => new FakeCaproverClientAdapter([
  FakeCaproverClientAdapter.buildApp({
    envVars: [{ key: "API_TOKEN", value: PLANTED_ENV_VALUE }],
    customDomains: [{ publicDomain: "www.example.org", hasSsl: true }],
  }),
]);

const findTool = (tools: ToolDefinition[], name: string): ToolDefinition => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    throw new Error(`No tool named ${name}`);
  }
  return tool;
};

const runTool = (name: string, input: Record<string, unknown>, fake = buildContractFake()): Promise<ToolOutcome> =>
  findTool(buildToolsWithFake(fake), name).call(input);

const readWriteCalls = (fake: FakeCaproverClientAdapter): string[] => fake.calls.filter((call) => !/^(get|list)/.test(call));

const buildTools = (): ToolDefinition[] => buildToolsWithFake(new FakeCaproverClientAdapter([]));

const selectRows = (tiers: string[]): ContractRow[] => {
  const nameToTier = new Map<string, string>(buildTools().map((tool) => [tool.name, tool.risk]));
  return CONTRACT_ROWS.filter(([name]) => tiers.includes(nameToTier.get(name) ?? ""));
};

const READ_ROWS = selectRows(["read"]);
const WRITE_ROWS = selectRows(["write"]);
const CONFIRMED_ROWS = selectRows(["destructive", "critical"]);
const CHANGE_ROWS = selectRows(["write", "destructive", "critical"]);

describe("OperationManifestSurface.build()", () => {
  it("lists every operation once, with its tier", () => {
    const tools = buildTools().map((tool) => `${tool.name}:${tool.risk}`);

    expect(tools).toStrictEqual([
      "get_overview:read",
      "get_access:read",
      "get_guide:read",
      "list_apps:read",
      "get_app:read",
      "get_app_runtime:read",
      "get_app_logs:read",
      "get_build_logs:read",
      "list_apps_runtime:read",
      "create_app:write",
      "deploy_image:write",
      "deploy_archive:write",
      "start_build:write",
      "set_env_vars:write",
      "scale_app:write",
      "rename_app:write",
      "delete_app:destructive",
      "add_custom_domain:write",
      "enable_ssl:write",
      "remove_custom_domain:destructive",
      "enable_root_ssl:write",
      "set_force_ssl:write",
      "update_root_domain:critical",
      "list_projects:read",
      "create_project:write",
      "update_project:write",
      "delete_projects:destructive",
      "list_one_click_apps:read",
      "get_one_click_app:read",
      "list_one_click_repos:read",
      "add_one_click_repo:write",
      "delete_one_click_repo:destructive",
      "deploy_one_click:write",
      "get_one_click_deploy_progress:read",
      "list_registries:read",
      "add_registry:write",
      "update_registry:write",
      "delete_registry:destructive",
      "set_default_push_registry:write",
      "enable_self_hosted_registry:critical",
      "disable_self_hosted_registry:critical",
      "list_nodes:read",
      "get_load_balancer:read",
      "add_node:critical",
      "get_disk_usage:read",
      "list_unused_images:read",
      "delete_images:critical",
      "get_disk_cleanup:read",
      "set_disk_cleanup:write",
      "get_nginx_config:read",
      "set_nginx_config:critical",
      "update_caprover:critical",
      "get_net_data:read",
      "set_net_data:write",
      "get_go_access:read",
      "set_go_access:write",
      "list_go_access_reports:read",
      "get_two_factor_status:read",
      "set_password:critical",
      "get_pro_state:read",
      "set_pro_api_key:write",
      "list_pro_alerts:read",
      "list_themes:read",
      "get_current_theme:read",
      "set_current_theme:write",
      "save_theme:write",
      "delete_theme:destructive",
    ]);
  });

  it("has 29 read, 24 write, 6 destructive and 8 critical operations", () => {
    const tiers = buildTools().map((tool) => tool.risk);
    const count = (risk: string): number => tiers.filter((tier) => tier === risk).length;

    expect([count("read"), count("write"), count("destructive"), count("critical")]).toStrictEqual([29, 24, 6, 8]);
  });

  it("puts every operation in the toolset of its area", () => {
    const toolsetToNames = new Map<string, string[]>();
    for (const tool of buildTools()) {
      toolsetToNames.set(tool.toolset, [...toolsetToNames.get(tool.toolset) ?? [], tool.name]);
    }

    expect([...toolsetToNames.keys()]).toStrictEqual([
      "core", "apps", "domains", "projects", "oneclick", "registries", "cluster", "maintenance", "monitoring", "account",
    ]);
    expect(toolsetToNames.get("core")).toStrictEqual([
      "get_overview", "get_access", "get_guide", "list_apps", "get_app", "get_app_runtime", "get_app_logs", "get_build_logs",
    ]);
  });

  it("starts the description of every read operation with Read-only.", () => {
    const readTools = buildTools().filter((tool) => tool.risk === "read");

    expect(readTools).toHaveLength(29);
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
  describe("contract of every operation", () => {
    it("has a sample input for every operation", () => {
      expect(CONTRACT_ROWS.map(([name]) => name)).toStrictEqual(buildTools().map((tool) => tool.name));
    });

    it.each(READ_ROWS)("%s reads and makes no write call", async (name, input) => {
      const fake = buildContractFake();

      const outcome = await runTool(name, input, fake);

      expect(outcome.isError).toBe(false);
      expect(outcome.summary.length).toBeGreaterThan(0);
      expect(readWriteCalls(fake)).toStrictEqual([]);
    });

    it.each(CHANGE_ROWS)("%s makes no write call on a dry run and says what would change", async (name, input) => {
      const fake = buildContractFake();

      const outcome = await runTool(name, { ...input, dry_run: true }, fake);

      expect(outcome.isError).toBe(false);
      expect(outcome.data).toMatchObject({ dry_run: true });
      expect(outcome.summary.startsWith("Dry run, nothing changed. Would")).toBe(true);
      expect(readWriteCalls(fake)).toStrictEqual([]);
    });

    it.each(CONFIRMED_ROWS)("%s changes nothing without a token and returns a preview with one", async (name, input) => {
      const fake = buildContractFake();

      const outcome = await runTool(name, input, fake);

      expect(outcome.data).toMatchObject({ requires_confirmation: true });
      expect(typeof outcome.data.confirmation_token).toBe("string");
      expect(readWriteCalls(fake)).toStrictEqual([]);
    });

    it.each(CONFIRMED_ROWS)("%s refuses a made-up token and still changes nothing", async (name, input) => {
      const fake = buildContractFake();

      const outcome = await runTool(name, { ...input, user_confirmed: true, confirmation_token: "made-up-token" }, fake);

      expect(outcome.isError).toBe(true);
      expect(outcome.data).toMatchObject({ requires_confirmation: true });
      expect(readWriteCalls(fake)).toStrictEqual([]);
    });

    it.each(WRITE_ROWS)("%s writes once when it is called for real", async (name, input) => {
      const fake = buildContractFake();

      const outcome = await runTool(name, input, fake);

      expect(outcome.isError).toBe(false);
      expect(readWriteCalls(fake)).toHaveLength(1);
    });

    it.each(CONTRACT_ROWS)("%s returns data that its output schema accepts", async (name, input) => {
      const tools = buildToolsWithFake(buildContractFake());
      const tool = findTool(tools, name);

      const outcome = await tool.call(input);

      expect(tool.outputSchema.safeParse(outcome.data).success).toBe(true);
    });

    it.each(PLANTED_SECRETS)("%s never returns the secret it was given", async (name, secret) => {
      const input = CONTRACT_ROWS.find(([rowName]) => rowName === name)?.[1] ?? {};
      const fake = buildContractFake();
      const tool = findTool(buildToolsWithFake(fake), name);

      const dryRun = await tool.call({ ...input, dry_run: true });
      const preview = await tool.call(input);
      const token = preview.data.confirmation_token;
      const confirmed = await tool.call({ ...input, user_confirmed: true, confirmation_token: token });

      const text = [dryRun, preview, confirmed].map((outcome) => `${outcome.summary} ${JSON.stringify(outcome.data)}`).join(" ");
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain(secret);
      expect(readWriteCalls(fake).length).toBeGreaterThanOrEqual(1);
    });

    it("never returns the value of an env var of an app", async () => {
      const outcomes = await Promise.all(CONTRACT_ROWS.slice(0, 22).map(([name, input]) => runTool(name, input)));

      const text = outcomes.map((outcome) => `${outcome.summary} ${JSON.stringify(outcome.data)}`).join(" ");
      expect(text).toContain("API_TOKEN");
      expect(text).not.toContain(PLANTED_ENV_VALUE);
    });
  });

  describe("risk tier note", () => {
    it("gives every operation the tier and the toolset that docs/product/risk-tiers.md lists", () => {
      const text = readFileSync("docs/product/risk-tiers.md", "utf8");
      const rows = [...text.matchAll(/^\| `\w+` \| `([a-z_]+)` \| (\w+) \| (\w+) \|$/gm)];
      const fromNote = rows.map((row) => `${row[1]}:${row[2]}:${row[3]}`);
      const fromCode = buildTools().map((tool) => `${tool.name}:${tool.risk}:${tool.toolset}`);

      expect(fromNote.length).toBeGreaterThan(60);
      expect(fromNote.filter((row) => !fromCode.includes(row))).toStrictEqual([]);
    });
  });

  describe("sdk coverage", () => {
    it("names only operations that exist in the manifest", () => {
      const names = new Set(buildTools().map((tool) => tool.name));
      const text = readFileSync("scripts/sdk-coverage.json", "utf8");
      const words = text.split(/[^a-z_]+/);
      const mentioned = words.filter((word) => word.includes("_"));

      expect(mentioned.length).toBeGreaterThan(60);
      expect(mentioned.filter((name) => !names.has(name))).toStrictEqual([]);
    });
  });
});
