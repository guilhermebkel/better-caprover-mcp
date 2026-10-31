import { SharedMcpRuntimeBuilder, type CaproverClientFactory } from "@/Server/SharedMcpRuntimeBuilder.ts";
import { McpServerMetadataUtil } from "@/Utils/McpServerMetadataUtil.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class ServerBuilder {
  static readonly SERVER_NAME = McpServerMetadataUtil.SERVER_NAME;

  static build(
    env: Env,
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
  ): McpServer {
    return SharedMcpRuntimeBuilder.buildFromEnv(env, getNowMs, createClient).buildMcpServer();
  }
}

export type { CaproverClientFactory };
