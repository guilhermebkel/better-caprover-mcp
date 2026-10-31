import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { SetDiskCleanupInput } from "@/Protocols/MaintenanceInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetDiskCleanupInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { SetDiskCleanupOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";

export class SetDiskCleanupOperation implements OperationPort<SetDiskCleanupInput> {
  static readonly NAME = "setDiskCleanup";

  readonly description = "Sets the automatic image cleanup: how many recent images per app to keep, when it runs and in which time zone. "
    + "Use it to stop the disk from filling up; to see the current setting, use `get_disk_cleanup`. "
    + "A low count deletes old images on the next run. It returns the new setting. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetDiskCleanupInputSchema;

  readonly outputSchema = SetDiskCleanupOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetDiskCleanupInput): Promise<OperationResult> {
    const current = await this.client.getDiskCleanup();
    return {
      summary: `Would keep ${input.keep_recent_count} recent images (now ${current.mostRecentLimit}) and run at "${input.cron_schedule}" `
        + `in ${input.timezone} (now "${current.cronSchedule}" in ${current.timezone}).`,
      data: SetDiskCleanupOperation.buildData(input),
    };
  }

  async execute(input: SetDiskCleanupInput): Promise<OperationResult> {
    await this.client.setDiskCleanup({
      mostRecentLimit: input.keep_recent_count,
      cronSchedule: input.cron_schedule,
      timezone: input.timezone,
    });
    return {
      summary: `The cleanup keeps ${input.keep_recent_count} recent images and runs at "${input.cron_schedule}" in ${input.timezone}.`,
      data: SetDiskCleanupOperation.buildData(input),
    };
  }

  private static buildData(input: SetDiskCleanupInput): Record<string, unknown> {
    return { keepRecentCount: input.keep_recent_count, cronSchedule: input.cron_schedule, timezone: input.timezone };
  }
}
