import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import type { AccessMode } from "@/Protocols/AccessProtocol.ts";
import { ServerBuilder } from "@/Server/ServerBuilder.ts";

const connectClient = async (mode: AccessMode): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await ServerBuilder.build(mode).connect(serverTransport);
  await client.connect(clientTransport);
  return client;
};

describe("ServerBuilder.build()", () => {
  it("advertises no tools yet", async () => {
    const client = await connectClient("readonly");

    expect(client.getServerCapabilities()?.tools).toBeUndefined();
  });

  it("introduces itself as the unofficial CapRover server", async () => {
    const client = await connectClient("readonly");

    expect(client.getServerVersion()?.name).toBe("better-caprover-mcp");
  });

  it("tells the client which access mode it runs in", async () => {
    const client = await connectClient("operate");

    expect(client.getInstructions()).toBe(
      "better-caprover-mcp is an unofficial MCP server for CapRover. This build exposes no operations yet. Access mode: operate.",
    );
  });
});
