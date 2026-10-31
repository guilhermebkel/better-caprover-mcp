import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_ENV = process.env.CAPROVER_TEST_URL ?? "http://127.0.0.1:3000";
const PASSWORD_ENV = process.env.CAPROVER_TEST_PASSWORD ?? "captain42";

describe("The built server on the code surface, against a real CapRover", () => {
  let client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/main.js"],
      env: { ...process.env, CAPROVER_URL: URL_ENV, CAPROVER_PASSWORD: PASSWORD_ENV, CAPROVER_MCP_SURFACE: "code" },
    });
    client = new Client({ name: "bundle-code-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("registers only search and execute", async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).toSorted()).toStrictEqual(["execute", "search"]);
  });

  it("runs a script in the sandbox that sees no host global", async () => {
    const result = await client.callTool({ name: "execute", arguments: { script: "return [typeof process, typeof require, typeof fetch];" } });

    expect(result.isError).toBe(false);
    expect(JSON.parse(result.structuredContent.output)).toStrictEqual(["undefined", "undefined", "undefined"]);
  });

  it("returns what the named tool returns when a script calls caprover.apps.list()", async () => {
    const named = await client.callTool({ name: "search", arguments: { query: "list apps", limit: 1 } });
    const scripted = await client.callTool({ name: "execute", arguments: { script: "return await caprover.apps.list();" } });

    expect(named.structuredContent.operations[0].tool).toBe("list_apps");
    expect(scripted.isError).toBe(false);
    expect(JSON.parse(scripted.structuredContent.output)).toMatchObject({ isTruncated: false });
  });
});
