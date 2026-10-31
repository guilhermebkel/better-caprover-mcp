import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetDiskUsageInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { GetDiskUsageOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";

export class GetDiskUsageOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getDiskUsage";

  readonly description = "Read-only. Reads the disk space of the server that hosts CapRover: total, used and available bytes of each "
    + "disk, with a severity of normal, warning or critical. Use it before a cleanup; to find images to delete, use `list_unused_images`. "
    + "It covers the CapRover node only, not other nodes or Docker data kept elsewhere.";

  readonly inputSchema = GetDiskUsageInputSchema;

  readonly outputSchema = GetDiskUsageOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const nodes = await this.client.getDiskUsage();
    const disks = nodes.flatMap((node) => node.disks);
    const worst = disks.some((disk) => disk.severity === "critical") ? "critical" : "not critical";
    return {
      summary: `${disks.length} disks on ${nodes.length} nodes; the worst state is ${worst}.`,
      data: { nodes },
    };
  }
}
