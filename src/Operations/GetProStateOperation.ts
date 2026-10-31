import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetProStateInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { GetProStateOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class GetProStateOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getProState";

  readonly description = "Read-only. Reads the CapRover Pro state: whether the feature flag is on and whether the server has a "
    + "subscription. Use it before `set_pro_api_key`; to see the alerts, use `list_pro_alerts`. "
    + "It never returns the API key. It always returns one object.";

  readonly inputSchema = GetProStateInputSchema;

  readonly outputSchema = GetProStateOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const state = await this.client.getProState();
    return {
      summary: `Pro feature flag ${state.isFeatureFlagEnabled ? "on" : "off"}; subscription ${state.isSubscribed ? "active" : "none"}.`,
      data: { ...state },
    };
  }
}
