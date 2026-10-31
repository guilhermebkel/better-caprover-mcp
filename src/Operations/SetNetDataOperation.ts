import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { SetNetDataInput } from "@/Protocols/MonitoringInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetNetDataInputSchema } from "@/Schemas/MonitoringInputSchema.ts";
import { SetNetDataOutputSchema } from "@/Schemas/MonitoringOutputSchema.ts";

export class SetNetDataOperation implements OperationPort<SetNetDataInput> {
  static readonly NAME = "setNetData";

  readonly description = "Starts or stops the NetData monitoring container and keeps its alert settings as they are. "
    + "Use it to turn monitoring on or off; to see the current state, use `get_net_data`. "
    + "NetData uses memory on the server while it runs. It returns the new and the previous state. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetNetDataInputSchema;

  readonly outputSchema = SetNetDataOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetNetDataInput): Promise<OperationResult> {
    const info = await this.client.getNetData();
    return {
      summary: `Would turn NetData ${input.is_enabled ? "on" : "off"}; it is ${info.isEnabled ? "on" : "off"} now.`,
      data: { isEnabled: input.is_enabled, previousIsEnabled: info.isEnabled },
    };
  }

  async execute(input: SetNetDataInput): Promise<OperationResult> {
    const info = await this.client.getNetData();
    await this.client.setNetDataEnabled(input.is_enabled);
    return {
      summary: `Turned NetData ${input.is_enabled ? "on" : "off"}; it was ${info.isEnabled ? "on" : "off"}.`,
      data: { isEnabled: input.is_enabled, previousIsEnabled: info.isEnabled },
    };
  }
}
