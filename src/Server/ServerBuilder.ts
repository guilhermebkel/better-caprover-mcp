import { McpApplicationService } from "@/Server/McpApplicationService.ts";
import { McpInstructions } from "@/Server/McpInstructions.ts";
import type { CaproverClientFactory } from "@/Services/CaproverServerRegistryService.ts";
import type { CaproverServerRegistryService } from "@/Services/CaproverServerRegistryService.ts";

export class ServerBuilder {
  static readonly SERVER_NAME = "better-caprover-mcp";

  static build(
    env: Parameters<typeof McpApplicationService.buildFromEnv>[0],
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
  ): import("@modelcontextprotocol/sdk/server/mcp.js").McpServer {
    return McpApplicationService.buildFromEnv(env, getNowMs, createClient).buildMcpServer();
  }

  static buildInstructions(registry: CaproverServerRegistryService): string {
    return McpInstructions.build(registry);
  }
}
