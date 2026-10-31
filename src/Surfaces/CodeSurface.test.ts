import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema, type ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import type { AccessMode, SurfaceName } from "@/Protocols/AccessProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { FakeCaproverOptions } from "@/Protocols/FakeCaproverClientProtocol.ts";
import { TOOLSETS } from "@/Schemas/AccessSchema.ts";
import { FakeCaproverClientAdapter } from "@/Testing/FakeCaproverClientAdapter.ts";
import { ServerSurface } from "@/Surfaces/ServerSurface.ts";

const FAKE_PASSWORD = "fake-password-9876";
const START_MS = 1_000_000;
const DELETE_WEB_SCRIPT = "return await caprover.app.delete({ app_name: 'web' });";

type Answer = "accept" | "decline";

type SetupOptions = FakeCaproverOptions & {
  surface?: SurfaceName;
  mode?: AccessMode;
  elicitation?: Answer;
};

type Reply = {
  isError: boolean;
  text: string;
  data: Record<string, unknown>;
};

const buildEnv = (surface: SurfaceName, mode: AccessMode): Env => ({
  CAPROVER_MCP_MODE: mode,
  CAPROVER_MCP_ALLOW_CRITICAL: false,
  CAPROVER_MCP_TOOLSETS: [...TOOLSETS],
  CAPROVER_MCP_SURFACE: surface,
  CAPROVER_MCP_TRANSPORT: "stdio",
  CAPROVER_MCP_LOG_LEVEL: "info",
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

const ANSWER_TO_RESULT: Record<Answer, ElicitResult> = {
  accept: { action: "accept", content: { confirm: true } },
  decline: { action: "decline" },
};

const buildClient = (elicitation: Answer | undefined): Client => {
  if (elicitation === undefined) {
    return new Client({ name: "test-client", version: "0.0.0" });
  }
  const client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: {} } });
  client.setRequestHandler(ElicitRequestSchema, () => Promise.resolve(ANSWER_TO_RESULT[elicitation]));
  return client;
};

const connect = async (options: SetupOptions = {}): Promise<{
  client: Client; fake: FakeCaproverClientAdapter;
}> => {
  const { surface = "code", mode = "admin", elicitation, ...fakeOptions } = options;
  const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()], fakeOptions);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = buildClient(elicitation);
  await ServerSurface.build(buildEnv(surface, mode), () => START_MS, () => fake).connect(serverTransport);
  await client.connect(clientTransport);
  return { client, fake };
};

const readFirstText = (content: unknown): string => {
  const first: unknown = Array.isArray(content) ? content[0] : undefined;
  if (typeof first !== "object" || first === null || !("text" in first)) {
    return "";
  }
  return typeof first.text === "string" ? first.text : "";
};

const callTool = async (client: Client, name: string, args: Record<string, unknown>): Promise<Reply> => {
  const result = await client.callTool({ name, arguments: args });
  return {
    isError: result.isError === true,
    text: readFirstText(result.content),
    data: Object.fromEntries(Object.entries(result.structuredContent ?? {})),
  };
};

const parseOutput = (reply: Reply): unknown => JSON.parse(String(reply.data.output));

const readOperations = (reply: Reply): Record<string, unknown>[] => {
  const operations: unknown = reply.data.operations;
  const list: unknown[] = Array.isArray(operations) ? operations : [];
  return list.map((operation) => (typeof operation === "object" && operation !== null ? Object.fromEntries(Object.entries(operation)) : {}));
};

const execute = (client: Client, script: string): Promise<Reply> => callTool(client, "execute", { script });

const listToolNames = async (client: Client): Promise<string[]> => {
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name).toSorted((first, second) => first.localeCompare(second));
};

const searchApis = async (client: Client, query: string): Promise<string[]> => {
  const reply = await callTool(client, "search", { query, limit: 100 });
  return readOperations(reply).map((operation) => String(operation.tool));
};

describe("CodeSurface.register()", () => {
  describe("which tools a client sees", () => {
    it("registers exactly search and execute when the surface is code", async () => {
      const { client } = await connect({ surface: "code" });

      expect(await listToolNames(client)).toStrictEqual(["execute", "search"]);
    });

    it("registers the named tools and not search or execute when the surface is tools", async () => {
      const { client } = await connect({ surface: "tools", mode: "readonly" });

      const names = await listToolNames(client);

      expect(names).toContain("list_apps");
      expect(names).not.toContain("search");
      expect(names).not.toContain("execute");
    });

    it("registers both sets when the surface is both", async () => {
      const { client } = await connect({ surface: "both", mode: "readonly" });

      const names = await listToolNames(client);

      expect(names).toContain("list_apps");
      expect(names).toContain("search");
      expect(names).toContain("execute");
    });
  });

  describe("search", () => {
    it("finds an operation with its signature, tier and description, and calls nothing on CapRover", async () => {
      const { client, fake } = await connect();

      const reply = await callTool(client, "search", { query: "env vars", limit: 1 });

      const [operation] = readOperations(reply);
      expect(reply.isError).toBe(false);
      expect(reply.data.isTruncated).toBe(true);
      expect(reply.data.total).toBeGreaterThan(1);
      expect(operation).toMatchObject({ api: "caprover.envVars.set", tool: "set_env_vars", risk: "write" });
      expect(String(operation?.signature)).toContain("caprover.envVars.set(args: { /** ");
      expect(fake.calls).toStrictEqual([]);
    });

    it("hides the confirmation fields a script cannot use", async () => {
      const { client } = await connect();

      const reply = await callTool(client, "search", { query: "delete_app", limit: 1 });

      const [operation] = readOperations(reply);
      const [argumentPart = ""] = String(operation?.signature).split("): Promise<");
      expect(operation).toMatchObject({ tool: "delete_app" });
      expect(argumentPart).toContain("dry_run?: boolean");
      expect(argumentPart).not.toContain("confirmation_token");
      expect(argumentPart).not.toContain("user_confirmed");
    });

    it.each<AccessMode>(["readonly", "operate", "admin"])("returns exactly the operations the %s mode registers as tools", async (mode) => {
      const { client: toolsClient } = await connect({ surface: "tools", mode });
      const { client: codeClient } = await connect({ surface: "code", mode });

      const registered = await listToolNames(toolsClient);

      expect((await searchApis(codeClient, "")).toSorted((first, second) => first.localeCompare(second))).toStrictEqual(registered);
    });
  });

  describe("execute", () => {
    it("returns the same result as the named tool for caprover.apps.list()", async () => {
      const { client: toolsClient } = await connect({ surface: "tools", mode: "readonly" });
      const { client: codeClient } = await connect({ mode: "readonly" });

      const named = await callTool(toolsClient, "list_apps", {});
      const scripted = await execute(codeClient, "return await caprover.apps.list();");

      expect(scripted.isError).toBe(false);
      const output = parseOutput(scripted);
      expect(output).toStrictEqual(named.data);
    });

    it("runs several calls in one script and returns only what the script returns", async () => {
      const { client, fake } = await connect({ mode: "operate" });

      const reply = await execute(client, "const before = await caprover.app.get({ app_name: 'web' }); "
        + "await caprover.app.scale({ app_name: 'web', instance_count: 2 }); return before.appName;");

      expect(reply.data).toMatchObject({ output: "\"web\"", hostCalls: 2 });
      expect(fake.calls).toContain("setInstanceCount:web:2");
    });

    it("says the line and the message of a failure and no stack of the host", async () => {
      const { client } = await connect();

      const reply = await execute(client, "const a = 1;\nthrow new Error('boom');");

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("The script failed at line 2: boom");
      expect(reply.text).not.toContain("node_modules");
      expect(reply.text).not.toContain("QuickJs");
    });

    it("cuts an output over the limit and says so", async () => {
      const { client } = await connect();

      const reply = await execute(client, "return 'x'.repeat(30000);");

      expect(reply.isError).toBe(false);
      expect(reply.data.isTruncated).toBe(true);
      expect(String(reply.data.output)).toHaveLength(20_000);
      expect(reply.text).toContain("The output was cut at the output limit");
    });

    it("gives the script no way to the host", async () => {
      const { client } = await connect();

      const reply = await execute(client, "return [typeof process, typeof require, typeof fetch, typeof globalThis.__call];");

      expect(reply.data.output).toBe("[\"undefined\",\"undefined\",\"undefined\",\"undefined\"]");
    });

    it("never returns the password, even when a script reads logs that hold it", async () => {
      const { client } = await connect({ appLogs: `login ok with ${FAKE_PASSWORD}\nready` });

      const reply = await execute(client, "const logs = await caprover.appLogs.get({ app_name: 'web' }); console.log(JSON.stringify(logs)); "
        + "return logs.lines;");

      const everything = `${reply.text}${JSON.stringify(reply.data)}`;
      expect(reply.data.output).toBe("[\"login ok with [REDACTED]\",\"ready\"]");
      expect(everything).not.toContain(FAKE_PASSWORD);
      expect(String(reply.data.logs)).toContain("[REDACTED]");
    });

    it("redacts a secret that the script builds itself from a host answer", async () => {
      const { client } = await connect({ failureMessage: `backend said ${FAKE_PASSWORD}`, failOnCall: "listApps" });

      const reply = await execute(client, "try { await caprover.apps.list(); } catch (error) { return error.message; }");

      expect(reply.data.output).not.toContain(FAKE_PASSWORD);
      expect(reply.text).not.toContain(FAKE_PASSWORD);
    });
  });

  describe("the access mode inside a script", () => {
    it("fails a write in readonly mode with the denial of the named tool and writes nothing", async () => {
      const { client, fake } = await connect({ mode: "readonly" });

      const reply = await execute(client, "return await caprover.app.scale({ app_name: 'web', instance_count: 3 });");

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("scale_app is a write operation. This server runs in \"readonly\" mode, which does not allow it.");
      expect(fake.calls).toStrictEqual([]);
    });

    it("fails a destructive call in operate mode and deletes nothing", async () => {
      const { client, fake } = await connect({ mode: "operate" });

      const reply = await execute(client, DELETE_WEB_SCRIPT);

      expect(reply.text).toContain("delete_app is a destructive operation. This server runs in \"operate\" mode, which does not allow it.");
      expect(fake.calls).toStrictEqual([]);
    });
  });

  describe("a destructive call from a script", () => {
    it("is refused without elicitation, says why and deletes nothing", async () => {
      const { client, fake } = await connect();

      const reply = await execute(client, DELETE_WEB_SCRIPT);

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("Refused: delete_app is a destructive operation and a script cannot confirm it.");
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual([]);
    });

    it("is refused when the script passes a confirmation of its own", async () => {
      const { client, fake } = await connect();

      const reply = await execute(client, "const preview = await caprover.app.delete({ app_name: 'web', dry_run: true }); "
        + "return await caprover.app.delete({ app_name: 'web', user_confirmed: true, confirmation_token: preview.confirmation_token ?? 'made-up' });");

      expect(reply.isError).toBe(true);
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual([]);
    });

    it("previews with dry_run and deletes nothing", async () => {
      const { client, fake } = await connect();

      const reply = await execute(client, "return await caprover.app.delete({ app_name: 'web', dry_run: true });");

      expect(reply.isError).toBe(false);
      const preview = parseOutput(reply);
      expect(preview).toMatchObject({ dry_run: true, appName: "web" });
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual([]);
    });

    it("deletes once the person accepts the question of the client", async () => {
      const { client, fake } = await connect({ elicitation: "accept" });

      const reply = await execute(client, DELETE_WEB_SCRIPT);

      expect(reply.isError).toBe(false);
      const deleted = parseOutput(reply);
      expect(deleted).toStrictEqual({ appName: "web", deletedVolumes: [] });
      expect(fake.calls).toContain("deleteApp:web:");
    });

    it("deletes nothing when the person declines the question of the client", async () => {
      const { client, fake } = await connect({ elicitation: "decline" });

      const reply = await execute(client, DELETE_WEB_SCRIPT);

      expect(reply.isError).toBe(true);
      expect(reply.text).toContain("The person declined delete_app");
      expect(fake.calls.filter((call) => call.startsWith("deleteApp"))).toStrictEqual([]);
    });
  });

  describe("parity with the named tools", () => {
    type ParityCase = {
      name: string;
      mode: AccessMode;
      tool: string;
      args: Record<string, unknown>;
      script: string;
      options?: FakeCaproverOptions;
    };

    const CASES: ParityCase[] = [
      {
        name: "a read",
        mode: "readonly",
        tool: "get_app",
        args: { app_name: "web" },
        script: "return await caprover.app.get({ app_name: 'web' });",
      },
      {
        name: "a write with dry_run",
        mode: "operate",
        tool: "scale_app",
        args: { app_name: "web", instance_count: 4, dry_run: true },
        script: "return await caprover.app.scale({ app_name: 'web', instance_count: 4, dry_run: true });",
      },
      {
        name: "a write",
        mode: "operate",
        tool: "scale_app",
        args: { app_name: "web", instance_count: 4 },
        script: "return await caprover.app.scale({ app_name: 'web', instance_count: 4 });",
      },
      {
        name: "a read that returns a planted secret",
        mode: "readonly",
        tool: "get_app_logs",
        args: { app_name: "web" },
        script: "return await caprover.appLogs.get({ app_name: 'web' });",
        options: { appLogs: `token ${FAKE_PASSWORD}` },
      },
    ];

    it.each(CASES)("gives the same result and the same CapRover calls for $name", async ({ mode, tool, args, script, options }) => {
      const named = await connect({ surface: "tools", mode, ...options });
      const scripted = await connect({ surface: "code", mode, ...options });

      const namedReply = await callTool(named.client, tool, args);
      const scriptedReply = await execute(scripted.client, script);

      expect(scriptedReply.isError).toBe(namedReply.isError);
      const output = parseOutput(scriptedReply);
      expect(output).toStrictEqual(namedReply.data);
      expect(scripted.fake.calls).toStrictEqual(named.fake.calls);
      expect(`${scriptedReply.text}${namedReply.text}`).not.toContain(FAKE_PASSWORD);
    });
  });
});
