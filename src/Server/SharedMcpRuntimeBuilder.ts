import type { CaproverClientFactory, SharedRuntimeParts } from "@/Protocols/SharedMcpRuntimeProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { McpInstructionsBuilder } from "@/Server/McpInstructionsBuilder.ts";
import { McpServerMetadataUtil } from "@/Utils/McpServerMetadataUtil.ts";
import { AuditLogService } from "@/Services/AuditLogService.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { PolicyService } from "@/Services/PolicyService.ts";
import { OperationManifest } from "@/Operations/OperationManifest.ts";
import { ToolsSurface } from "@/Surfaces/ToolsSurface.ts";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class SharedMcpRuntimeBuilder {
  private readonly parts: SharedRuntimeParts;

  private constructor(parts: SharedRuntimeParts) {
    this.parts = parts;
  }

  static buildFromEnv(
    env: Env,
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
    concurrencyQueueWaitMs?: number,
  ): SharedMcpRuntimeBuilder {
    const client = createClient?.(env) ?? CaproverClientAdapter.buildFromEnv(env);
    const policy = new PolicyService(env.CAPROVER_MCP_MODE, env.CAPROVER_MCP_ALLOW_CRITICAL);
    const secrets = SharedMcpRuntimeBuilder.collectSecrets(env);
    const limiter = new ConcurrencyLimiterService(
      env.CAPROVER_MCP_MAX_CONCURRENT,
      concurrencyQueueWaitMs,
    );
    const parts: SharedRuntimeParts = {
      audit: new AuditLogService(),
      confirmation: new ConfirmationService(getNowMs),
      limiter,
      policy,
      secrets,
      client,
      getNowMs,
    };
    return new SharedMcpRuntimeBuilder(parts);
  }

  private static collectSecrets(env: Env): string[] {
    const secrets: string[] = [];
    if (env.CAPROVER_MCP_HTTP_TOKEN !== undefined) {
      secrets.push(env.CAPROVER_MCP_HTTP_TOKEN);
    }
    if (env.CAPROVER_PASSWORD !== undefined) {
      secrets.push(env.CAPROVER_PASSWORD);
    }
    return secrets;
  }

  buildRunner(): OperationRunnerService {
    return new OperationRunnerService({
      audit: this.parts.audit,
      confirmation: this.parts.confirmation,
      getNowMs: this.parts.getNowMs,
      limiter: this.parts.limiter,
      policy: this.parts.policy,
      secrets: this.parts.secrets,
    });
  }

  buildMcpServer(): McpServer {
    const runner = this.buildRunner();
    const tools = OperationManifest.build(this.parts.client, this.parts.policy, runner)
      .filter((tool) => this.parts.policy.canRun(tool.risk));
    const server = new McpServer(
      { name: McpServerMetadataUtil.SERVER_NAME, version: __PACKAGE_VERSION__ },
      { instructions: McpInstructionsBuilder.build(this.parts.policy) },
    );
    ToolsSurface.register(server, tools);
    return server;
  }
}
