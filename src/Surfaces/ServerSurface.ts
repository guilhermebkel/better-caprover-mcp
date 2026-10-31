import type { CaproverClientFactory } from "@/Protocols/SharedMcpRuntimeProtocol.ts";
import { SharedMcpRuntimeSurface } from "@/Surfaces/SharedMcpRuntimeSurface.ts";
import { McpServerMetadataUtil } from "@/Utils/McpServerMetadataUtil.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class ServerSurface {
  static readonly SERVER_NAME = McpServerMetadataUtil.SERVER_NAME;

  static build(
    env: Env,
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
  ): McpServer {
    return SharedMcpRuntimeSurface.buildFromEnv(env, getNowMs, createClient).buildMcpServer();
  }
}

export type { CaproverClientFactory };
