import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetNginxConfigInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { GetNginxConfigOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";

export class GetNginxConfigOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getNginxConfig";

  static readonly MAX_CHARACTERS = 20_000;

  readonly description = "Read-only. Reads whether the base and the CapRover nginx templates are customized, and the custom text of each, "
    + "cut at 20000 characters. Use it before `set_nginx_config`. The default templates are not returned. "
    + "`isTruncated` is true when a custom text was cut. It always returns one object.";

  readonly inputSchema = GetNginxConfigInputSchema;

  readonly outputSchema = GetNginxConfigOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const config = await this.client.getNginxConfig();
    const max = GetNginxConfigOperation.MAX_CHARACTERS;
    const isTruncated = config.base.customValue.length > max || config.captain.customValue.length > max;
    return {
      summary: `Base template customized: ${config.base.hasCustomValue}. CapRover template customized: ${config.captain.hasCustomValue}.`,
      data: {
        baseHasCustomValue: config.base.hasCustomValue,
        baseCustomValue: config.base.customValue.slice(0, max),
        captainHasCustomValue: config.captain.hasCustomValue,
        captainCustomValue: config.captain.customValue.slice(0, max),
        isTruncated,
      },
    };
  }
}
