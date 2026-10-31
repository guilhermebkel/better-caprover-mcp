import { SharedMcpRuntimeBuilder } from "@/Server/SharedMcpRuntimeBuilder.ts";
import { McpServerMetadata } from "@/Server/McpServerMetadata.ts";
import type { CaproverClientFactory } from "@/Services/CaproverServerRegistryService.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class ServerBuilder {
  static readonly SERVER_NAME = McpServerMetadata.SERVER_NAME;

  static build(
    env: Env,
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
  ): McpServer {
    return SharedMcpRuntimeBuilder.buildFromEnv(env, getNowMs, createClient).buildMcpServer();
  }
}
