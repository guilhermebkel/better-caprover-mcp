import type { CaproverClientFactory, SharedRuntimeParts } from "@/Protocols/SharedMcpRuntimeProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import type { AskPerson, PersonAnswer } from "@/Protocols/OperationRunnerProtocol.ts";
import { GuideSurface } from "@/Surfaces/GuideSurface.ts";
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { McpInstructionsSurface } from "@/Surfaces/McpInstructionsSurface.ts";
import { McpServerMetadataUtil } from "@/Utils/McpServerMetadataUtil.ts";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";
import { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import { PolicyService } from "@/Services/PolicyService.ts";
import { OperationManifestSurface } from "@/Surfaces/OperationManifestSurface.ts";
import { ToolsSurface } from "@/Surfaces/ToolsSurface.ts";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class SharedMcpRuntimeSurface {
  private readonly parts: SharedRuntimeParts;

  private constructor(parts: SharedRuntimeParts) {
    this.parts = parts;
  }

  static buildFromEnv(
    env: Env,
    getNowMs: () => number,
    createClient?: CaproverClientFactory,
    concurrencyQueueWaitMs?: number,
  ): SharedMcpRuntimeSurface {
    const client = createClient?.(env) ?? CaproverClientAdapter.buildFromEnv(env);
    const policy = new PolicyService(env.CAPROVER_MCP_MODE, env.CAPROVER_MCP_ALLOW_CRITICAL);
    const secrets = SharedMcpRuntimeSurface.collectSecrets(env);
    const limiter = new ConcurrencyLimiterService(
      env.CAPROVER_MCP_MAX_CONCURRENT,
      concurrencyQueueWaitMs,
    );
    const parts: SharedRuntimeParts = {
      client,
      getNowMs,
      limiter,
      policy,
      secrets,
      confirmation: new ConfirmationService(getNowMs),
      toolsets: env.CAPROVER_MCP_TOOLSETS,
    };
    return new SharedMcpRuntimeSurface(parts);
  }

  private static async askPerson(server: McpServer, message: string): Promise<PersonAnswer> {
    if (server.server.getClientCapabilities()?.elicitation === undefined) {
      return "unavailable";
    }
    try {
      const result = await server.server.elicitInput({
        message: `${message} Allow it?`,
        requestedSchema: {
          type: "object",
          properties: { confirm: { type: "boolean", title: "Allow this change" } },
          required: ["confirm"],
        },
      });
      const isAccepted = result.action === "accept" && result.content?.confirm === true;
      return isAccepted ? "accepted" : "declined";
    } catch {
      return "declined";
    }
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

  buildRunner(askPerson?: AskPerson): OperationRunnerService {
    return new OperationRunnerService({
      askPerson,
      confirmation: this.parts.confirmation,
      getNowMs: this.parts.getNowMs,
      limiter: this.parts.limiter,
      policy: this.parts.policy,
      secrets: this.parts.secrets,
    });
  }

  buildMcpServer(): McpServer {
    const server = new McpServer(
      { name: McpServerMetadataUtil.SERVER_NAME, version: __PACKAGE_VERSION__ },
      { instructions: McpInstructionsSurface.build(this.parts.policy, this.parts.toolsets) },
    );
    const isElicitationAvailable = (): boolean => server.server.getClientCapabilities()?.elicitation !== undefined;
    const runner = this.buildRunner((message) => SharedMcpRuntimeSurface.askPerson(server, message));
    const { toolsets } = this.parts;
    const manifest = OperationManifestSurface.build(this.parts.client, this.parts.policy, runner, {
      toolsets,
      isElicitationAvailable,
    });
    const tools = manifest.filter((tool) => toolsets.includes(tool.toolset) && this.parts.policy.canRun(tool.risk));
    ToolsSurface.register(server, tools);
    GuideSurface.register(server);
    return server;
  }
}
