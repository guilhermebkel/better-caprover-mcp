import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetDiskCleanupInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { GetDiskCleanupOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";

export class GetDiskCleanupOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getDiskCleanup";

  readonly description = "Read-only. Reads the automatic image cleanup of the server: how many recent images per app it keeps, "
    + "its cron schedule and its time zone. Use it before `set_disk_cleanup`; to clean by hand, use `list_unused_images`. "
    + "It always returns one object.";

  readonly inputSchema = GetDiskCleanupInputSchema;

  readonly outputSchema = GetDiskCleanupOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const settings = await this.client.getDiskCleanup();
    return {
      summary: `The cleanup keeps ${settings.mostRecentLimit} recent images and runs at "${settings.cronSchedule}" `
        + `(${settings.timezone}).`,
      data: {
        keepRecentCount: settings.mostRecentLimit,
        cronSchedule: settings.cronSchedule,
        timezone: settings.timezone,
      },
    };
  }
}
