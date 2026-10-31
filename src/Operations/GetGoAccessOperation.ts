import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetGoAccessInputSchema } from "@/Schemas/MonitoringInputSchema.ts";
import { GetGoAccessOutputSchema } from "@/Schemas/MonitoringOutputSchema.ts";

export class GetGoAccessOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getGoAccess";

  readonly description = "Read-only. Reads the GoAccess web traffic report setting: whether it is on, the cron schedule of the log "
    + "rotation and how many days of logs it keeps. Use it before `set_go_access`; to read the reports of an app, "
    + "use `list_go_access_reports`. `logRetentionDays` is absent when CapRover does not report it.";

  readonly inputSchema = GetGoAccessInputSchema;

  readonly outputSchema = GetGoAccessOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const info = await this.client.getGoAccess();
    return { summary: `GoAccess is ${info.isEnabled ? "on" : "off"}; logs rotate at "${info.rotationFrequencyCron}".`, data: { ...info } };
  }
}
