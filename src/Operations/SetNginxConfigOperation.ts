import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { SetNginxConfigInput } from "@/Protocols/MaintenanceInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetNginxConfigInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { SetNginxConfigOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";

export class SetNginxConfigOperation implements OperationPort<SetNginxConfigInput> {
  static readonly NAME = "setNginxConfig";

  readonly description = "Replaces the custom nginx templates of CapRover; a text with a mistake can stop the web server and every app. "
    + "Run it only when the person gave the exact text and asked for the change. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "To read the current ones, use `get_nginx_config`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = SetNginxConfigInputSchema;

  readonly outputSchema = SetNginxConfigOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetNginxConfigInput): Promise<OperationResult> {
    const current = await this.client.getNginxConfig();
    const isBaseChanged = input.base_config !== undefined && input.base_config !== current.base.customValue;
    const isCaptainChanged = input.captain_config !== undefined && input.captain_config !== current.captain.customValue;
    return {
      summary: `Would change the base template: ${isBaseChanged}; the CapRover template: ${isCaptainChanged}. `
        + "A wrong template can stop the web server and every app.",
      data: { isBaseChanged, isCaptainChanged },
    };
  }

  async execute(input: SetNginxConfigInput): Promise<OperationResult> {
    const current = await this.client.getNginxConfig();
    const baseConfig = input.base_config ?? current.base.customValue;
    const captainConfig = input.captain_config ?? current.captain.customValue;
    await this.client.setNginxConfig(baseConfig, captainConfig);
    return {
      summary: "Saved the nginx templates. CapRover reloads nginx with them.",
      data: { isBaseChanged: input.base_config !== undefined, isCaptainChanged: input.captain_config !== undefined },
    };
  }
}
