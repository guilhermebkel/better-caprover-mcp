import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { FakeCaproverClientAdapter } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import type { FakeCaproverOptions } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import type { AccessMode } from "@/Protocols/AccessProtocol.ts";
import type { CaproverApp } from "@/Protocols/CaproverClientProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { CaproverClientFactory } from "@/Server/ServerBuilder.ts";
import { ServerBuilder } from "@/Server/ServerBuilder.ts";

const FAKE_PASSWORD = "fake-password-9876";
const FAKE_ENV_VALUE = "fake-env-value-123";
const START_MS = 1_000_000;

type Setup = {
  client: Client;
  fake: FakeCaproverClientAdapter;
};

type SetupOptions = FakeCaproverOptions & {
  mode?: AccessMode;
  apps?: CaproverApp[];
  getNowMs?: () => number;
};

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
  CAPROVER_MCP_MAX_CONCURRENT: 5,
});

const buildTestClient = (fake: FakeCaproverClientAdapter): CaproverClientFactory => () => fake;

const connect = async (options: SetupOptions = {}): Promise<Setup> => {
  const { mode = "admin", apps = [FakeCaproverClientAdapter.buildApp()], getNowMs = () => START_MS, ...fakeOptions } = options;
  const fake = new FakeCaproverClientAdapter(apps, fakeOptions);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await ServerBuilder.build(buildEnv(mode), getNowMs, buildTestClient(fake)).connect(serverTransport);
  await client.connect(clientTransport);
  return { client, fake };
};

const listToolNames = async (mode: AccessMode): Promise<string[]> => {
  const { client } = await connect({ mode });
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

const READ_TOOLS = [
  "get_overview",
  "list_apps",
  "get_app",
  "get_app_runtime",
  "get_app_logs",
  "get_build_logs",
  "list_one_click_apps",
];

const WRITE_TOOLS = ["create_app", "deploy_image", "set_env_vars", "scale_app", "add_custom_domain", "enable_ssl"];

describe("ServerBuilder.build()", () => {
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
      expect(await listToolNames("readonly")).toStrictEqual(READ_TOOLS);
    });

    it("adds the write tools in operate mode", async () => {
      expect(await listToolNames("operate")).toStrictEqual([...READ_TOOLS, ...WRITE_TOOLS]);
    });

    it("adds the delete tool in admin mode", async () => {
      expect(await listToolNames("admin")).toStrictEqual([...READ_TOOLS, ...WRITE_TOOLS, "delete_app"]);
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
      expect(fake.calls).toContain("deleteApp:web:");
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
});
