import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetNetDataInputSchema } from "@/Schemas/MonitoringInputSchema.ts";
import { GetNetDataOutputSchema } from "@/Schemas/MonitoringOutputSchema.ts";

export class GetNetDataOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getNetData";

  readonly description = "Read-only. Reads whether the NetData monitoring container runs, its URL, and which alert channels "
    + "(smtp, slack, telegram, pushBullet) have settings. Use it before `set_net_data`. "
    + "It never returns a token, a password or a hook URL. It always returns one object.";

  readonly inputSchema = GetNetDataInputSchema;

  readonly outputSchema = GetNetDataOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const info = await this.client.getNetData();
    return {
      summary: `NetData is ${info.isEnabled ? "on" : "off"}; ${info.configuredChannels.length} alert channels are set.`,
      data: { ...info },
    };
  }
}
