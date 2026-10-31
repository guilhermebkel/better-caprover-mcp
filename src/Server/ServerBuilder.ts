import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AccessMode } from "@/Protocols/AccessProtocol.ts";

export class ServerBuilder {
  static readonly SERVER_NAME = "better-caprover-mcp";

  static build(mode: AccessMode): McpServer {
    const instructions = [
      "better-caprover-mcp is an unofficial MCP server for CapRover.",
      "This build exposes no operations yet.",
      `Access mode: ${mode}.`,
    ].join(" ");
    return new McpServer({ name: ServerBuilder.SERVER_NAME, version: __PACKAGE_VERSION__ }, { instructions });
  }
}
