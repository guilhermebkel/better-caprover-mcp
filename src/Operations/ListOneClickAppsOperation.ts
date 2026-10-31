import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ListOneClickAppsInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListOneClickAppsInputSchema } from "@/Schemas/AppInputSchema.ts";
import { ListOneClickAppsOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class ListOneClickAppsOperation implements OperationPort<ListOneClickAppsInput> {
  static readonly NAME = "listOneClickApps";

  static readonly DEFAULT_LIMIT = 50;

  readonly description = "Read-only. Lists the one-click apps (ready-made templates such as databases) that the CapRover "
    + "server can install, optionally only those that match a text. Use it to see what CapRover offers; "
    + "to see the apps already installed, use `list_apps`. It returns `apps` (empty when nothing matches), "
    + "`total` and `isTruncated`; set `limit` or `query` when `isTruncated` is true.";

  readonly inputSchema = ListOneClickAppsInputSchema;

  readonly outputSchema = ListOneClickAppsOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListOneClickAppsInput): Promise<OperationResult> {
    const templates = await this.client.listOneClickApps();
    const text = input.query?.toLowerCase();
    const matching = templates.filter((template) => text === undefined
      || `${template.name} ${template.displayName} ${template.description}`.toLowerCase().includes(text));
    const shown = matching.slice(0, input.limit ?? ListOneClickAppsOperation.DEFAULT_LIMIT);
    return {
      summary: `${matching.length} one-click apps match; showing ${shown.length}.`,
      data: { apps: shown, total: matching.length, isTruncated: matching.length > shown.length },
    };
  }
}
