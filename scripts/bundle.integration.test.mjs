import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_ENV = process.env.CAPROVER_TEST_URL ?? "http://127.0.0.1:3000";
const PASSWORD_ENV = process.env.CAPROVER_TEST_PASSWORD ?? "captain42";
const APP_NAME = `mcp-bundle-${Date.now().toString(36)}`;
const FAKE_ENV_VALUE = "fake-env-value-123456";

const readText = (result) => result.content[0].text;

describe("The built server, started the way a client starts it, against a real CapRover", () => {
  let client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/main.js"],
      env: {
        ...process.env,
        CAPROVER_URL: URL_ENV,
        CAPROVER_PASSWORD: PASSWORD_ENV,
        CAPROVER_MCP_MODE: "admin",
      },
    });
    client = new Client({ name: "bundle-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("reads the overview", async () => {
    const result = await client.callTool({ name: "get_overview", arguments: {} });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({ accessMode: "admin", enabledRiskTiers: ["read", "write", "destructive"] });
  });

  it("creates an app and sets an env var, and never returns its value", async () => {
    await client.callTool({ name: "create_app", arguments: { app_name: APP_NAME } });
    await client.callTool({ name: "set_env_vars", arguments: { app_name: APP_NAME, env_vars: `TOKEN=${FAKE_ENV_VALUE}` } });

    const result = await client.callTool({ name: "get_app", arguments: { app_name: APP_NAME } });

    expect(result.structuredContent.envVars).toStrictEqual([{ key: "TOKEN", isSet: true }]);
    expect(readText(result)).not.toContain(FAKE_ENV_VALUE);
  });

  it("deletes nothing until the confirmation token comes back", async () => {
    const preview = await client.callTool({ name: "delete_app", arguments: { app_name: APP_NAME } });

    const listed = await client.callTool({ name: "list_apps", arguments: { name_contains: APP_NAME } });

    expect(preview.structuredContent.requires_confirmation).toBe(true);
    expect(listed.structuredContent.total).toBe(1);
  });

  it("deletes the app after the confirmation", async () => {
    const preview = await client.callTool({ name: "delete_app", arguments: { app_name: APP_NAME } });
    const token = preview.structuredContent.confirmation_token;

    await client.callTool({
      name: "delete_app",
      arguments: { app_name: APP_NAME, user_confirmed: true, confirmation_token: token },
    });
    const listed = await client.callTool({ name: "list_apps", arguments: { name_contains: APP_NAME } });

    expect(listed.structuredContent.total).toBe(0);
  });
});
