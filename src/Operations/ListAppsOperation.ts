import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ListAppsInput, ResponseFormat } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverApp, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListAppsInputSchema } from "@/Schemas/AppInputSchema.ts";
import { AppViewUtil } from "@/Utils/AppViewUtil.ts";

export class ListAppsOperation implements OperationPort<ListAppsInput> {
  static readonly NAME = "listApps";

  static readonly DEFAULT_LIMIT = 50;

  static readonly FORMAT_TO_VIEW: Record<ResponseFormat, (app: CaproverApp) => Record<string, unknown>> = {
    concise: (app) => AppViewUtil.buildConcise(app),
    detailed: (app) => AppViewUtil.buildDetailed(app),
  };

  readonly description = "Read-only. Lists the apps on the CapRover server, optionally only those whose name contains a text. "
    + "Use it to find an app name; to read one app in full, use `get_app`. "
    + "It returns `apps`, `total` and `isTruncated`; `apps` is empty when nothing matches. "
    + "It returns at most `limit` apps, so set `limit` or `name_contains` when `isTruncated` is true.";

  readonly inputSchema = ListAppsInputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListAppsInput): Promise<OperationResult> {
    const { apps } = await this.client.listApps();
    const text = input.name_contains?.toLowerCase();
    const matching = apps.filter((app) => text === undefined || app.appName.toLowerCase().includes(text));
    const limit = input.limit ?? ListAppsOperation.DEFAULT_LIMIT;
    const shown = matching.slice(0, limit);
    const isTruncated = matching.length > shown.length;
    const buildView = ListAppsOperation.FORMAT_TO_VIEW[input.response_format ?? "concise"];
    return {
      summary: `${matching.length} apps match; showing ${shown.length}.`,
      data: { apps: shown.map((app) => buildView(app)), total: matching.length, isTruncated },
    };
  }
}
