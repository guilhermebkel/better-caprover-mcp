import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { DeleteImagesInput } from "@/Protocols/MaintenanceInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { DEFAULT_KEEP_RECENT_COUNT, DeleteImagesInputSchema } from "@/Schemas/MaintenanceInputSchema.ts";
import { DeleteImagesOutputSchema } from "@/Schemas/MaintenanceOutputSchema.ts";
import { BatchUtil } from "@/Utils/BatchUtil.ts";

export class DeleteImagesOperation implements OperationPort<DeleteImagesInput> {
  static readonly NAME = "deleteImages";

  readonly description = "Deletes Docker images from the server one by one, in the order given, and stops at the first failure. "
    + "Run it only when the person asked to delete these images, never to tidy up. A deleted image cannot be restored; "
    + "an app that needs it must be built again. It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "It returns `applied` and `notApplied`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = DeleteImagesInputSchema;

  readonly outputSchema = DeleteImagesOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: DeleteImagesInput): Promise<OperationResult> {
    const unused = await this.client.listUnusedImages(DEFAULT_KEEP_RECENT_COUNT);
    const unusedIds = unused.map((image) => image.imageId);
    const notListed = input.image_ids.filter((imageId) => !unusedIds.includes(imageId));
    const warning = notListed.length === 0 ? "" : ` ${notListed.length} are not in the unused list and may be in use.`;
    return {
      summary: `Would delete ${input.image_ids.length} images.${warning} This cannot be undone.`,
      data: { imageIds: input.image_ids, notListedIds: notListed },
    };
  }

  async execute(input: DeleteImagesInput): Promise<OperationResult> {
    const outcome = await BatchUtil.run(input.image_ids, (imageId) => this.client.deleteImages([imageId]));
    return BatchUtil.buildResult({ pastVerb: "Deleted", noun: "images", outcome });
  }
}
