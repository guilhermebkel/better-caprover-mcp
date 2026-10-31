import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RoutingCaproverClientAdapter } from "@/Adapters/CapRover/RoutingCaproverClientAdapter.ts";
import { OperationManifest } from "@/Operations/OperationManifest.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { AuditLogService } from "@/Services/AuditLogService.ts";
import {
  CaproverServerRegistryService,
  type CaproverClientFactory,
} from "@/Services/CaproverServerRegistryService.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { McpInstructions } from "@/Server/McpInstructions.ts";
import { ToolsSurface } from "@/Surfaces/ToolsSurface.ts";

export const MCP_SERVER_NAME = "better-caprover-mcp";

type SharedRuntimeParts = {
  registry: CaproverServerRegistryService;
  confirmation: ConfirmationService;
  audit: AuditLogService;
  limiter: ConcurrencyLimiterService;
  getNowMs: () => number;
};

export class McpApplicationService {
  readonly registry: CaproverServerRegistryService;
  readonly limiter: ConcurrencyLimiterService;
  private readonly parts: SharedRuntimeParts;

  private constructor(env: Env, parts: SharedRuntimeParts) {
    this.registry = parts.registry;
    this.limiter = parts.limiter;
    this.parts = parts;
    void env;
  }

  static buildFromEnv(
    env: Env,
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
  ): McpApplicationService {
    const registry = CaproverServerRegistryService.buildFromEnv(env, createClient);
    const limiter = new ConcurrencyLimiterService(env.CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER);
    const parts: SharedRuntimeParts = {
      audit: new AuditLogService(),
      confirmation: new ConfirmationService(getNowMs),
      limiter,
      getNowMs,
      registry,
    };
    return new McpApplicationService(env, parts);
  }

  buildRunner(): OperationRunnerService {
    return new OperationRunnerService(
      this.parts.registry,
      this.parts.confirmation,
      this.parts.audit,
      this.parts.limiter,
      this.parts.getNowMs,
    );
  }

  buildMcpServer(): McpServer {
    const runner = this.buildRunner();
    const router = new RoutingCaproverClientAdapter();
    const tools = OperationManifest.build(router, this.registry, runner)
      .filter((tool) => this.registry.canRunOnAnyServer(tool.risk));
    const server = new McpServer(
      { name: MCP_SERVER_NAME, version: __PACKAGE_VERSION__ },
      { instructions: McpInstructions.build(this.registry) },
    );
    ToolsSurface.register(server, tools);
    return server;
  }
}
