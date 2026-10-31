import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { UpdateCaproverInput } from "@/Protocols/MaintenanceInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ToolFailureError } from "@/Errors/ToolFailureError.ts";
import { UpdateCaproverInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { UpdateCaproverOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";

export class UpdateCaproverOperation implements OperationPort<UpdateCaproverInput> {
  static readonly NAME = "updateCaprover";

  readonly description = "Updates CapRover itself to the latest version it reports. The dashboard and every app restart, "
    + "and a failed update can leave the server down. Run it only when the person asked to update now. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "To see the versions first, use `get_overview`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = UpdateCaproverInputSchema;

  readonly outputSchema = UpdateCaproverOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    const outcome = info.canUpdate ? "The web server and every app restart." : "There is no newer version, so the call would fail.";
    return {
      summary: `Would update CapRover from ${info.currentVersion} to ${info.latestVersion}. ${outcome}`,
      data: { currentVersion: info.currentVersion, targetVersion: info.latestVersion, canUpdate: info.canUpdate },
    };
  }

  async execute(): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    if (!info.canUpdate) {
      throw new ToolFailureError(`CapRover ${info.currentVersion} is the latest version. There is nothing to update.`);
    }
    await this.client.updateServerVersion(info.latestVersion);
    return {
      summary: `CapRover started the update from ${info.currentVersion} to ${info.latestVersion}. The server restarts; read \`get_overview\` in a minute.`,
      data: { currentVersion: info.currentVersion, targetVersion: info.latestVersion },
    };
  }
}
