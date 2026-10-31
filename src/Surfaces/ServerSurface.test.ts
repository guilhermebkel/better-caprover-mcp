import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema, type ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeCaproverClientAdapter } from "@/Testing/FakeCaproverClientAdapter.ts";
import type { FakeCaproverOptions } from "@/Protocols/FakeCaproverClientProtocol.ts";
import type { AccessMode, Toolset } from "@/Protocols/AccessProtocol.ts";
import type { CaproverApp } from "@/Protocols/CaproverClientProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { CaproverClientFactory } from "@/Protocols/SharedMcpRuntimeProtocol.ts";
import { ServerSurface } from "@/Surfaces/ServerSurface.ts";

const FAKE_PASSWORD = "fake-password-9876";
const FAKE_ENV_VALUE = "fake-env-value-123";
const START_MS = 1_000_000;
const AUDIT_LIST_APPS_OK = "{\"level\":\"audit\",\"time\":\"1970-01-01T00:00:00.000Z\",\"tool\":\"list_apps\",\"risk\":\"read\",\"result\":\"ok\"}\n";
const AUDIT_LIST_APPS_ERROR = "{\"level\":\"audit\",\"time\":\"1970-01-01T00:00:00.000Z\",\"tool\":\"list_apps\",\"risk\":\"read\",\"result\":\"error\"}\n";
const PLANTED_LIST_FILTER = "planted-audit-filter-xyzzy";

type Setup = {
  client: Client;
  fake: FakeCaproverClientAdapter;
};

type ElicitationAnswer = "accept" | "decline" | "cancel";

type SetupOptions = FakeCaproverOptions & {
  elicitation?: ElicitationAnswer;
  mode?: AccessMode;
  toolsets?: Toolset[];
  isCriticalAllowed?: boolean;
  apps?: CaproverApp[];
  getNowMs?: () => number;
};

const DEFAULT_TOOLSETS: Toolset[] = ["core", "apps", "domains", "oneclick"];

const buildEnv = (mode: AccessMode, toolsets: Toolset[], isCriticalAllowed: boolean): Env => ({
  CAPROVER_MCP_MODE: mode,
  CAPROVER_MCP_ALLOW_CRITICAL: isCriticalAllowed,
  CAPROVER_MCP_TOOLSETS: toolsets,
  CAPROVER_URL: "https://captain.example.com",
  CAPROVER_PASSWORD: FAKE_PASSWORD,
  CAPROVER_MCP_HTTP_HOST: "127.0.0.1",
  CAPROVER_MCP_HTTP_PORT: 3100,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: 1_048_576,
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: 120,
  CAPROVER_MCP_MAX_HTTP_SESSIONS: 64,
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: 86_400_000,
  CAPROVER_MCP_MAX_CONCURRENT: 5,
});

const buildTestClient = (fake: FakeCaproverClientAdapter): CaproverClientFactory => () => fake;

const ANSWER_TO_ELICIT_RESULT: Record<ElicitationAnswer, ElicitResult> = {
  accept: { action: "accept", content: { confirm: true } },
  decline: { action: "decline" },
  cancel: { action: "cancel" },
};

const buildClient = (elicitation: ElicitationAnswer | undefined): Client => {
  if (elicitation === undefined) {
    return new Client({ name: "test-client", version: "0.0.0" });
  }
  const client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: {} } });
  client.setRequestHandler(ElicitRequestSchema, () => Promise.resolve(ANSWER_TO_ELICIT_RESULT[elicitation]));
  return client;
};

const connect = async (options: SetupOptions = {}): Promise<Setup> => {
  const {
    elicitation,
    mode = "admin",
    toolsets = DEFAULT_TOOLSETS,
    isCriticalAllowed = false,
    apps = [FakeCaproverClientAdapter.buildApp()],
    getNowMs = () => START_MS,
    ...fakeOptions
  } = options;
  const fake = new FakeCaproverClientAdapter(apps, fakeOptions);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = buildClient(elicitation);
  const env = buildEnv(mode, toolsets, isCriticalAllowed);
  const createClient = buildTestClient(fake);
  await ServerSurface.build(env, getNowMs, createClient).connect(serverTransport);
  await client.connect(clientTransport);
  return { client, fake };
};

const listToolNames = async (mode: AccessMode, options: SetupOptions = {}): Promise<string[]> => {
  const { client } = await connect({ ...options, mode });
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name);
};

type ToolReply = {
  isError: boolean;
  text: string;
  data: Record<string, unknown>;
};

const readFirstText = (content: unknown): string => {
  const first: unknown = Array.isArray(content) ? content[0] : undefined;
  if (typeof first !== "object" || first === null || !("text" in first)) {
    return "";
  }
  return typeof first.text === "string" ? first.text : "";
};

const callTool = async (client: Client, name: string, args: Record<string, unknown>): Promise<ToolReply> => {
  const result = await client.callTool({ name, arguments: args });
  return {
    isError: result.isError === true,
    text: readFirstText(result.content),
    data: Object.fromEntries(Object.entries(result.structuredContent ?? {})),
  };
};

const readAuditLines = (stderr: { mock: { calls: readonly unknown[][] } }): string[] => {
  return stderr.mock.calls
    .map((call) => String(call[0]))
    .filter((line: string) => line.includes("\"level\":\"audit\""));
};

const READ_TOOLS = [
  "get_overview",
  "get_access",
  "get_guide",
  "list_apps",
  "get_app",
  "get_app_runtime",
  "get_app_logs",
  "get_build_logs",
  "list_apps_runtime",
  "list_one_click_apps",
  "get_one_click_app",
  "list_one_click_repos",
  "get_one_click_deploy_progress",
];

const WRITE_TOOLS = [
  "create_app",
  "deploy_image",
  "deploy_archive",
  "start_build",
  "set_env_vars",
  "scale_app",
  "rename_app",
  "add_custom_domain",
  "enable_ssl",
  "enable_root_ssl",
  "set_force_ssl",
  "add_one_click_repo",
  "deploy_one_click",
];

const DESTRUCTIVE_TOOLS = ["delete_app", "remove_custom_domain", "delete_one_click_repo"];

const DELETE_APP_CALL = "deleteApp:web:";

const ROOT_DOMAIN_INPUT = { root_domain: "apps.example.org" };

const DELETE_IMAGE_B_CALL = "deleteImages:sha256:b";

const CRITICAL_TOOLS = ["update_root_domain"];

const sortNames = (names: string[]): string[] => names.toSorted((first, second) => first.localeCompare(second));

describe("ServerSurface.build()", () => {
  describe("what a client sees", () => {
    it("introduces itself as the unofficial CapRover server", async () => {
      const { client } = await connect();

      expect(client.getServerVersion()?.name).toBe("better-caprover-mcp");
    });

    it("tells the client the mode and the enabled tiers", async () => {
      const { client } = await connect({ mode: "operate" });

      expect(client.getInstructions()).toContain("Access mode: operate. Enabled risk tiers: read, write.");
    });

    it("registers only the read tools in readonly mode", async () => {
      expect(sortNames(await listToolNames("readonly"))).toStrictEqual(sortNames(READ_TOOLS));
    });

    it("adds the write tools in operate mode", async () => {
      expect(sortNames(await listToolNames("operate"))).toStrictEqual(sortNames([...READ_TOOLS, ...WRITE_TOOLS]));
    });

    it("adds the destructive tools in admin mode and keeps the critical ones out", async () => {
      expect(sortNames(await listToolNames("admin"))).toStrictEqual(
        sortNames([...READ_TOOLS, ...WRITE_TOOLS, ...DESTRUCTIVE_TOOLS]),
      );
    });

    it("adds the critical tools only in admin mode with the critical switch on", async () => {
      expect(sortNames(await listToolNames("admin", { isCriticalAllowed: true }))).toStrictEqual(
        sortNames([...READ_TOOLS, ...WRITE_TOOLS, ...DESTRUCTIVE_TOOLS, ...CRITICAL_TOOLS]),
      );
    });

    it("keeps the critical tools out of operate mode even with the critical switch on", async () => {
      expect(await listToolNames("operate", { isCriticalAllowed: true })).not.toContain("update_root_domain");
    });

    it("marks read tools as read-only and delete as destructive", async () => {
      const { client } = await connect();

      const { tools } = await client.listTools();
      const findAnnotations = (name: string): unknown => tools.find((tool) => tool.name === name)?.annotations;

      expect(findAnnotations("list_apps")).toStrictEqual({ readOnlyHint: true, idempotentHint: true, openWorldHint: false });
      expect(findAnnotations("scale_app")).toStrictEqual({
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      });
      expect(findAnnotations("delete_app")).toStrictEqual({
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      });
    });

    it("refuses a tool that the mode did not register", async () => {
      const { client, fake } = await connect({ mode: "readonly" });

      const reply = await callTool(client, "delete_app", { app_name: "web" });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("Tool delete_app not found");
      expect(fake.calls).toStrictEqual([]);
    });
  });

  describe("reads", () => {
    it("lists the apps in the concise form", async () => {
      const { client } = await connect({ apps: [FakeCaproverClientAdapter.buildApp()] });

      const reply = await callTool(client, "list_apps", {});

      expect(reply.data).toStrictEqual({
        apps: [{ appName: "web", url: "https://web.example.com", instanceCount: 1, imageName: "nginx:1.27", isBuilding: false }],
        total: 1,
        isTruncated: false,
      });
    });

    it("says the list was cut and keeps the total", async () => {
      const apps = [
        FakeCaproverClientAdapter.buildApp({ appName: "api" }),
        FakeCaproverClientAdapter.buildApp({ appName: "web" }),
      ];
      const { client } = await connect({ apps });

      const reply = await callTool(client, "list_apps", { limit: 1 });

      expect(reply.data).toMatchObject({ total: 2, isTruncated: true });
    });

    it("filters apps by name in the server", async () => {
      const apps = [
        FakeCaproverClientAdapter.buildApp({ appName: "api" }),
        FakeCaproverClientAdapter.buildApp({ appName: "web" }),
      ];
      const { client } = await connect({ apps });

      const reply = await callTool(client, "list_apps", { name_contains: "WE" });

      expect(reply.data).toMatchObject({ total: 1 });
    });

    it("never returns the value of an env var", async () => {
      const app = FakeCaproverClientAdapter.buildApp({ envVars: [{ key: "API_TOKEN", value: FAKE_ENV_VALUE }] });
      const { client } = await connect({ apps: [app] });

      const reply = await callTool(client, "get_app", { app_name: "web" });

      expect(reply.data.envVars).toStrictEqual([{ key: "API_TOKEN", isSet: true }]);
      expect(reply.text).not.toContain(FAKE_ENV_VALUE);
    });

    it("answers an unknown app with the closest names", async () => {
      const { client } = await connect();

      const reply = await callTool(client, "get_app", { app_name: "wep" });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("App \"wep\" does not exist. Closest app names: web.");
    });

    it("reports the mode and the enabled tiers in the overview", async () => {
      const { client } = await connect({ mode: "operate" });

      const reply = await callTool(client, "get_overview", {});

      expect(reply.data).toMatchObject({ accessMode: "operate", enabledRiskTiers: ["read", "write"], appCount: 1 });
    });

    it("lists the one-click apps that match a text", async () => {
      const { client } = await connect();

      const reply = await callTool(client, "list_one_click_apps", { query: "sql" });

      expect(reply.data).toStrictEqual({
        apps: [{ name: "postgres", displayName: "PostgreSQL", description: "The SQL database" }],
        total: 1,
        isTruncated: false,
      });
    });
  });

  describe("logs", () => {
    it("hides the value of an env var of the app and the password", async () => {
      const app = FakeCaproverClientAdapter.buildApp({ envVars: [{ key: "API_TOKEN", value: FAKE_ENV_VALUE }] });
      const appLogs = `start\ntoken=${FAKE_ENV_VALUE}\nlogin with ${FAKE_PASSWORD}\n`;
      const { client } = await connect({ apps: [app], appLogs });

      const reply = await callTool(client, "get_app_logs", { app_name: "web" });

      expect(reply.data.lines).toStrictEqual(["start", "token=[REDACTED]", "login with [REDACTED]"]);
      expect(reply.text).not.toContain(FAKE_ENV_VALUE);
      expect(reply.text).not.toContain(FAKE_PASSWORD);
    });

    it("returns the last lines and says the log was cut", async () => {
      const { client } = await connect({ appLogs: "a\nb\nc\n" });

      const reply = await callTool(client, "get_app_logs", { app_name: "web", lines: 2 });

      expect(reply.data).toMatchObject({ lines: ["b", "c"], totalLines: 3, isTruncated: true });
    });

    it("hides secrets in the build log too", async () => {
      const app = FakeCaproverClientAdapter.buildApp({ envVars: [{ key: "API_TOKEN", value: FAKE_ENV_VALUE }] });
      const { client } = await connect({ apps: [app], buildLines: [`ARG ${FAKE_ENV_VALUE}`] });

      const reply = await callTool(client, "get_build_logs", { app_name: "web" });

      expect(reply.data.lines).toStrictEqual(["ARG [REDACTED]"]);
    });
  });

  describe("writes", () => {
    it("scales an app and reports the old and new count", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "scale_app", { app_name: "web", instance_count: 3 });

      expect(reply.data).toStrictEqual({ appName: "web", previousInstanceCount: 1, instanceCount: 3 });
      expect(fake.calls).toContain("setInstanceCount:web:3");
    });

    it("makes no write call on a dry run", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "scale_app", { app_name: "web", instance_count: 3, dry_run: true });

      expect(reply.data).toMatchObject({ dry_run: true, previousInstanceCount: 1, instanceCount: 3 });
      expect(fake.calls).toStrictEqual(["listApps"]);
    });

    it.each([
      { tool: "create_app", args: { app_name: "new-app" } },
      { tool: "deploy_image", args: { app_name: "web", image_name: "nginx:1.28" } },
      { tool: "set_env_vars", args: { app_name: "web", env_vars: "A=1" } },
      { tool: "add_custom_domain", args: { app_name: "web", domain: "api.example.com" } },
      { tool: "enable_ssl", args: { app_name: "web" } },
    ])("does not write when $tool runs as a dry run", async (row) => {
      const { client, fake } = await connect();

      const reply = await callTool(client, row.tool, { ...row.args, dry_run: true });

      expect(reply.data).toMatchObject({ dry_run: true });
      expect(fake.calls.filter((call) => !call.startsWith("listApps"))).toStrictEqual([]);
    });

    it("merges env vars, keeps the others and never returns a value", async () => {
      const app = FakeCaproverClientAdapter.buildApp({
        envVars: [{ key: "KEEP", value: FAKE_ENV_VALUE }, { key: "CHANGE", value: "old" }, { key: "DROP", value: "x" }],
      });
      const { client, fake } = await connect({ apps: [app] });

      const reply = await callTool(client, "set_env_vars", {
        app_name: "web",
        env_vars: `CHANGE=new\nADD=${FAKE_ENV_VALUE}`,
        remove_keys: ["DROP"],
      });

      expect(reply.data).toStrictEqual({
        appName: "web",
        addedKeys: ["ADD"],
        updatedKeys: ["CHANGE"],
        removedKeys: ["DROP"],
        totalKeysAfter: 3,
      });
      expect(fake.calls).toContain("setEnvVars:web:KEEP,CHANGE,ADD");
      expect(reply.text).not.toContain(FAKE_ENV_VALUE);
    });

    it("quotes the bad line of env vars without its value", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "set_env_vars", { app_name: "web", env_vars: "A=1\nbroken line with secret" });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("Invalid env_vars at line 2: expected KEY=value. The line starts with \"broken\".");
      expect(fake.calls).toStrictEqual(["listApps"]);
    });

    it("refuses a call that sets and removes nothing", async () => {
      const { client } = await connect();

      const reply = await callTool(client, "set_env_vars", { app_name: "web" });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("Provide `env_vars`, `remove_keys` or both.");
    });

    it("refuses an instance count above the limit", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "scale_app", { app_name: "web", instance_count: 51 });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("expected number to be <=50 at instance_count");
      expect(fake.calls).toStrictEqual([]);
    });

    it("refuses a field it does not know", async () => {
      const { client } = await connect();

      const reply = await callTool(client, "scale_app", { app_name: "web", instance_count: 2, replicas: 2 });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("Unrecognized key: \"replicas\"");
    });

    it("says the name is taken in the preview of create_app", async () => {
      const { client } = await connect();

      const reply = await callTool(client, "create_app", { app_name: "web", dry_run: true });

      expect(reply.data).toMatchObject({ isNameTaken: true });
    });
  });

  describe("delete_app", () => {
    it("deletes nothing without confirmation and returns a preview with a token", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "delete_app", { app_name: "web" });

      expect(reply.isError).toBe(false);
      expect(reply.data).toMatchObject({ requires_confirmation: true, appName: "web", volumesToDelete: [] });
      expect(reply.data.confirmation_token).toMatch(/^[0-9a-f]{32}$/);
      expect(fake.calls).toStrictEqual(["listApps"]);
    });

    it("deletes the app once the person confirmed with the token of the preview", async () => {
      const { client, fake } = await connect();
      const preview = await callTool(client, "delete_app", { app_name: "web" });

      const reply = await callTool(client, "delete_app", {
        app_name: "web",
        user_confirmed: true,
        confirmation_token: preview.data.confirmation_token,
      });

      expect(reply.isError).toBe(false);
      expect(reply.data).toStrictEqual({ appName: "web", deletedVolumes: [] });
      expect(fake.calls).toContain(DELETE_APP_CALL);
    });

    it("refuses user_confirmed without a token and returns a new preview", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "delete_app", { app_name: "web", user_confirmed: true });

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("The confirmation token is missing, expired, or from a different call.");
      expect(fake.calls).toStrictEqual(["listApps"]);
    });

    it("refuses a token that was used already", async () => {
      const { client, fake } = await connect();
      const preview = await callTool(client, "delete_app", { app_name: "web" });
      const confirmed = { app_name: "web", user_confirmed: true, confirmation_token: preview.data.confirmation_token };
      await callTool(client, "delete_app", confirmed);

      const reply = await callTool(client, "delete_app", confirmed);

      expect(reply.isError).toBe(true);
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual(["deleteApp:web:"]);
    });

    it("refuses the token of a preview when the call changed", async () => {
      const apps = [FakeCaproverClientAdapter.buildApp({ appName: "web" }), FakeCaproverClientAdapter.buildApp({ appName: "api" })];
      const { client, fake } = await connect({ apps });
      const preview = await callTool(client, "delete_app", { app_name: "web" });

      const reply = await callTool(client, "delete_app", {
        app_name: "api",
        user_confirmed: true,
        confirmation_token: preview.data.confirmation_token,
      });

      expect(reply.isError).toBe(true);
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual([]);
    });

    it("refuses the token after five minutes", async () => {
      let nowMs = START_MS;
      const { client, fake } = await connect({ getNowMs: () => nowMs });
      const preview = await callTool(client, "delete_app", { app_name: "web" });
      nowMs = START_MS + 300_000;

      const reply = await callTool(client, "delete_app", {
        app_name: "web",
        user_confirmed: true,
        confirmation_token: preview.data.confirmation_token,
      });

      expect(reply.isError).toBe(true);
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual([]);
    });

    it("lists the volumes it would delete and the ones it would keep", async () => {
      const app = FakeCaproverClientAdapter.buildApp({
        volumes: [{ containerPath: "/data", volumeName: "web-data" }, { containerPath: "/logs", hostPath: "/var/logs" }],
      });
      const { client } = await connect({ apps: [app] });

      const keep = await callTool(client, "delete_app", { app_name: "web" });
      const remove = await callTool(client, "delete_app", { app_name: "web", delete_volumes: true });

      expect(keep.data).toMatchObject({ volumesToDelete: [], volumesKept: ["web-data"] });
      expect(remove.data).toMatchObject({ volumesToDelete: ["web-data"], volumesKept: [] });
    });

    it("makes no call at all on a dry run, and gives no token", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "delete_app", { app_name: "web", dry_run: true });

      expect(reply.data).toMatchObject({ dry_run: true, appName: "web" });
      expect(reply.data.confirmation_token).toBeUndefined();
      expect(fake.calls).toStrictEqual(["listApps"]);
    });
  });

  describe("errors", () => {
    it("hides the password when an error message carries it", async () => {
      const { client } = await connect({ failureMessage: `CapRover said no to ${FAKE_PASSWORD}` });

      const reply = await callTool(client, "list_apps", {});

      expect(reply.isError).toBe(true);
      expect(reply.text).toBe("CapRover said no to [REDACTED]\n{}");
    });

    it("says there is no similar name when the server has no apps", async () => {
      const { client } = await connect({ apps: [] });

      const reply = await callTool(client, "get_app", { app_name: "web" });

      expect(reply.text).toContain("The server has no app with a similar name.");
    });
  });

  describe("toolsets", () => {
    it("registers only the operations of the named toolsets", async () => {
      const names = await listToolNames("admin", { toolsets: ["projects"] });

      expect(sortNames(names)).toStrictEqual(sortNames(["list_projects", "create_project", "update_project", "delete_projects"]));
    });

    it("registers no operation of a toolset that was not named", async () => {
      const names = await listToolNames("admin", { toolsets: ["core"] });

      expect(names).not.toContain("create_app");
      expect(names).not.toContain("list_projects");
    });
  });

  describe("get_access", () => {
    it("reports the mode, the tiers, the toolsets, the version and the Pro state", async () => {
      const { client } = await connect({ mode: "operate", toolsets: ["core", "apps"] });

      const reply = await callTool(client, "get_access", {});

      expect(reply.data).toStrictEqual({
        accessMode: "operate",
        enabledRiskTiers: ["read", "write"],
        isCriticalUnlocked: false,
        surface: "tools",
        toolsets: ["core", "apps"],
        isElicitationAvailable: false,
        caproverVersion: "1.14.1",
        isProFeatureFlagEnabled: true,
        isProSubscribed: false,
      });
    });

    it("says critical operations are unlocked when the switch is on in admin mode", async () => {
      const { client } = await connect({ mode: "admin", isCriticalAllowed: true });

      const reply = await callTool(client, "get_access", {});

      expect(reply.data).toMatchObject({ isCriticalUnlocked: true, enabledRiskTiers: ["read", "write", "destructive", "critical"] });
    });

    it("says the client can ask the person when it supports elicitation", async () => {
      const { client } = await connect({ elicitation: "accept" });

      const reply = await callTool(client, "get_access", {});

      expect(reply.data).toMatchObject({ isElicitationAvailable: true });
    });

    it("still answers when the Pro state cannot be read", async () => {
      const { client } = await connect({ failureMessage: "no pro", failOnCall: "getProState" });

      const reply = await callTool(client, "get_access", {});

      expect(reply.data).toMatchObject({ proStateError: "The Pro state could not be read: no pro" });
    });
  });

  describe("get_guide", () => {
    it("returns the topic that was asked for", async () => {
      const { client } = await connect({ mode: "readonly" });

      const reply = await callTool(client, "get_guide", { topic: "env-vars" });

      expect(reply.data).toMatchObject({ topic: "env-vars" });
      expect(reply.text).toContain("KEY=value");
    });

    it("answers an unknown topic with the valid names", async () => {
      const { client } = await connect({ mode: "readonly" });

      const reply = await callTool(client, "get_guide", { topic: "pizza" });

      expect(reply.isError).toBe(true);
      expect(reply.data).toStrictEqual({ topics: ["modes", "code-mode", "app-definition", "env-vars", "deploy", "errors"] });
    });

    it("serves every topic as a resource caprover://docs/<topic>", async () => {
      const { client } = await connect({ mode: "readonly" });

      const { resources } = await client.listResources();
      const result = await client.readResource({ uri: "caprover://docs/modes" });

      expect(resources.map((resource) => resource.uri)).toStrictEqual([
        "caprover://docs/modes",
        "caprover://docs/code-mode",
        "caprover://docs/app-definition",
        "caprover://docs/env-vars",
        "caprover://docs/deploy",
        "caprover://docs/errors",
      ]);
      expect(JSON.stringify(result.contents)).toContain("CAPROVER_MCP_MODE");
    });
  });

  describe("critical operations", () => {
    it("changes nothing on the first call and returns a preview with a token", async () => {
      const { client, fake } = await connect({ mode: "admin", isCriticalAllowed: true });

      const reply = await callTool(client, "update_root_domain", ROOT_DOMAIN_INPUT);

      expect(reply.data).toMatchObject({ requires_confirmation: true });
      expect(fake.calls).toStrictEqual(["getSystemInfo"]);
    });

    it("runs once the person confirmed with the token of the preview", async () => {
      const { client, fake } = await connect({ mode: "admin", isCriticalAllowed: true });
      const preview = await callTool(client, "update_root_domain", ROOT_DOMAIN_INPUT);

      const reply = await callTool(client, "update_root_domain", {
        ...ROOT_DOMAIN_INPUT,
        user_confirmed: true,
        confirmation_token: preview.data.confirmation_token,
      });

      expect(reply.isError).toBe(false);
      expect(fake.calls).toContain("updateRootDomain:apps.example.org:false");
    });

    it("refuses to register when the critical switch is off", async () => {
      const { client, fake } = await connect({ mode: "admin", isCriticalAllowed: false });

      const reply = await callTool(client, "update_root_domain", ROOT_DOMAIN_INPUT);

      expect(reply.isError).toBe(true);
      expect(fake.calls).toStrictEqual([]);
    });
  });

  describe("elicitation", () => {
    const confirmDelete = async (client: Client): Promise<ToolReply> => {
      const preview = await callTool(client, "delete_app", { app_name: "web" });
      return callTool(client, "delete_app", {
        app_name: "web",
        user_confirmed: true,
        confirmation_token: preview.data.confirmation_token,
      });
    };

    it("deletes when the person accepts the question of the client", async () => {
      const { client, fake } = await connect({ elicitation: "accept" });

      const reply = await confirmDelete(client);

      expect(reply.isError).toBe(false);
      expect(fake.calls).toContain(DELETE_APP_CALL);
    });

    it.each(["decline", "cancel"] as const)("deletes nothing when the person answers %s", async (answer) => {
      const { client, fake } = await connect({ elicitation: answer });

      const reply = await confirmDelete(client);

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("The person declined delete_app");
      expect(fake.calls).not.toContain(DELETE_APP_CALL);
    });

    it("keeps the token flow when the client cannot ask", async () => {
      const { client, fake } = await connect({});

      const reply = await confirmDelete(client);

      expect(reply.isError).toBe(false);
      expect(fake.calls).toContain(DELETE_APP_CALL);
    });
  });

  describe("outputs", () => {
    it("declares an output schema on every registered tool", async () => {
      const { client } = await connect({
        mode: "admin",
        isCriticalAllowed: true,
        toolsets: ["core", "apps", "domains", "projects", "oneclick", "registries", "cluster", "maintenance", "monitoring", "account"],
      });

      const { tools } = await client.listTools();

      expect(tools.length).toBeGreaterThan(60);
      expect(tools.filter((tool) => tool.outputSchema?.type !== "object").map((tool) => tool.name)).toStrictEqual([]);
    });
  });

  describe("batch writes", () => {
    const IMAGE_IDS = ["sha256:a", "sha256:b", "sha256:c"];

    const confirmDeleteImages = async (client: Client): Promise<ToolReply> => {
      const preview = await callTool(client, "delete_images", { image_ids: IMAGE_IDS });
      return callTool(client, "delete_images", {
        image_ids: IMAGE_IDS,
        user_confirmed: true,
        confirmation_token: preview.data.confirmation_token,
      });
    };

    it("applies every item when none fails", async () => {
      const { client, fake } = await connect({ isCriticalAllowed: true, toolsets: ["maintenance"] });

      const reply = await confirmDeleteImages(client);

      expect(reply.data).toMatchObject({ applied: IMAGE_IDS, notApplied: [] });
      expect(fake.calls.filter((call) => call.startsWith("deleteImages"))).toStrictEqual([
        "deleteImages:sha256:a",
        DELETE_IMAGE_B_CALL,
        "deleteImages:sha256:c",
      ]);
    });

    it("stops at the first failure and reports what was and was not applied", async () => {
      const { client, fake } = await connect({
        isCriticalAllowed: true,
        toolsets: ["maintenance"],
        failureMessage: "image in use",
        failOnCall: DELETE_IMAGE_B_CALL,
      });

      const reply = await confirmDeleteImages(client);

      expect(reply.isError).toBe(true);
      expect(reply.data).toMatchObject({ applied: ["sha256:a"], notApplied: ["sha256:b", "sha256:c"], failure: "image in use" });
      expect(fake.calls.filter((call) => call.startsWith("deleteImages"))).toStrictEqual([
        "deleteImages:sha256:a",
        DELETE_IMAGE_B_CALL,
      ]);
    });
  });

  describe("when a tool runs", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("writes exactly one audit line for a list_apps call", async () => {
      const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const { client } = await connect({ getNowMs: () => 0 });
      stderr.mockClear();

      await callTool(client, "list_apps", {});

      expect(readAuditLines(stderr)).toStrictEqual([AUDIT_LIST_APPS_OK]);
    });

    it("omits tool argument values from the audit line", async () => {
      const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const { client } = await connect({ getNowMs: () => 0 });
      stderr.mockClear();

      await callTool(client, "list_apps", { name_contains: PLANTED_LIST_FILTER });

      const auditLines = readAuditLines(stderr);
      expect(auditLines.length).toBeGreaterThan(0);
      expect(auditLines).toStrictEqual([AUDIT_LIST_APPS_OK]);
      expect(auditLines[0]).not.toContain(PLANTED_LIST_FILTER);
    });

    it("writes exactly one error audit line when list_apps fails", async () => {
      const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const { client } = await connect({ getNowMs: () => 0, failureMessage: "CapRover unavailable" });
      stderr.mockClear();

      await callTool(client, "list_apps", {});

      expect(readAuditLines(stderr)).toStrictEqual([AUDIT_LIST_APPS_ERROR]);
    });
  });
});
