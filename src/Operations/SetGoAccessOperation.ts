import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort, CaproverGoAccess, GoAccessRequest } from "@/Protocols/CaproverClientProtocol.ts";
import type { SetGoAccessInput } from "@/Protocols/MonitoringInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetGoAccessInputSchema } from "@/Schemas/MonitoringInputSchema.ts";
import { SetGoAccessOutputSchema } from "@/Schemas/MonitoringOutputSchema.ts";

const DEFAULT_ROTATION_CRON = "0 0 * * *";
const DEFAULT_RETENTION_DAYS = 10;

export class SetGoAccessOperation implements OperationPort<SetGoAccessInput> {
  static readonly NAME = "setGoAccess";

  readonly description = "Turns the GoAccess web traffic reports on or off and sets the log rotation and retention, "
    + "keeping the values you leave out. Use it to start collecting traffic reports; to read the current setting, use `get_go_access`. "
    + "Logs older than the retention are deleted. It returns the new setting. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetGoAccessInputSchema;

  readonly outputSchema = SetGoAccessOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetGoAccessInput): Promise<OperationResult> {
    const request = SetGoAccessOperation.buildRequest(input, await this.client.getGoAccess());
    return {
      summary: `Would turn GoAccess ${request.isEnabled ? "on" : "off"}, rotate logs at "${request.rotationFrequencyCron}" `
        + `and keep ${request.logRetentionDays} days.`,
      data: { ...request },
    };
  }

  async execute(input: SetGoAccessInput): Promise<OperationResult> {
    const request = SetGoAccessOperation.buildRequest(input, await this.client.getGoAccess());
    await this.client.setGoAccess(request);
    return {
      summary: `GoAccess is ${request.isEnabled ? "on" : "off"}; logs rotate at "${request.rotationFrequencyCron}" and are kept ${request.logRetentionDays} days.`,
      data: { ...request },
    };
  }

  private static buildRequest(input: SetGoAccessInput, current: CaproverGoAccess): GoAccessRequest {
    return {
      isEnabled: input.is_enabled,
      rotationFrequencyCron: input.rotation_frequency_cron ?? (current.rotationFrequencyCron || DEFAULT_ROTATION_CRON),
      logRetentionDays: input.log_retention_days ?? current.logRetentionDays ?? DEFAULT_RETENTION_DAYS,
    };
  }
}
