import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListUnusedImagesInput } from "@/Protocols/MaintenanceInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { DEFAULT_KEEP_RECENT_COUNT, ListUnusedImagesInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { ListUnusedImagesOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListUnusedImagesOperation implements OperationPort<ListUnusedImagesInput> {
  static readonly NAME = "listUnusedImages";

  readonly description = "Read-only. Lists the Docker images that no app uses, keeping the most recent ones of each app out of the list. "
    + "Use it to find ids for `delete_images`; to see how full the disk is, use `get_disk_usage`. "
    + "It returns `images`, `total` and `isTruncated`; raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListUnusedImagesInputSchema;

  readonly outputSchema = ListUnusedImagesOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListUnusedImagesInput): Promise<OperationResult> {
    const keepRecentCount = input.keep_recent_count ?? DEFAULT_KEEP_RECENT_COUNT;
    const rows = await this.client.listUnusedImages(keepRecentCount);
    return ListUtil.buildResult({ noun: "images", rows, input });
  }
}
